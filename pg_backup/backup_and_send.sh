#!/bin/bash

set -o pipefail

source /etc/environment

# Конфигурация
DB_NAME=${DB_NAME:-"test_db"}          # Имя базы данных
DB_USER=${DB_USER:-"postgres"}        # Пользователь базы
DB_PASSWORD=${DB_PASSWORD:-"password"} # Пароль пользователя
DB_HOST=db2  # Имя или адрес контейнера с базой данных
TELEGRAM_TOKEN=${TELEGRAM_TOKEN}      # Токен Telegram бота
CHAT_ID=${CHAT_ID}                    # ID чата или пользователя Telegram
BACKUP_DIR="/app/backups"             # Директория для хранения бэкапов
TELEGRAM_UPLOAD_LIMIT=49000000         # Оставляем запас относительно лимита Telegram в 50 МБ

# Создаём директорию для бэкапов (если её нет)
mkdir -p "$BACKUP_DIR"

# Текущая дата для имени файла
TIMESTAMP=$(date +"%Y_%m_%d")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

# Экспорт переменной окружения для pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Создание и сжатие бэкапа базы данных
echo "Создание и сжатие бэкапа базы данных..."
if ! pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F p | gzip -9 > "$BACKUP_FILE"; then
    rm -f "$BACKUP_FILE"
    echo "Ошибка создания бэкапа базы данных."
    exit 1
fi

echo "Бэкап создан: $BACKUP_FILE"

send_to_telegram() {
    local file_path="$1"

    curl --fail-with-body --silent --show-error \
        -F chat_id="$CHAT_ID" \
        -F document=@"$file_path" \
        "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendDocument" \
        > /dev/null
}

cleanup() {
    if [ -n "${CHUNKS_DIR:-}" ] && [ -d "$CHUNKS_DIR" ]; then
        rm -rf "$CHUNKS_DIR"
    fi
}

trap cleanup EXIT

# Telegram Bot API принимает файлы размером до 50 МБ. Большой архив отправляем частями.
if ! BACKUP_SIZE=$(stat -c %s "$BACKUP_FILE"); then
    echo "Не удалось определить размер бэкапа."
    exit 1
fi

if [ "$BACKUP_SIZE" -le "$TELEGRAM_UPLOAD_LIMIT" ]; then
    FILES_TO_SEND=("$BACKUP_FILE")
else
    if ! CHUNKS_DIR=$(mktemp -d); then
        echo "Не удалось создать временную директорию для частей бэкапа."
        exit 1
    fi
    if ! split -b "$TELEGRAM_UPLOAD_LIMIT" -d -a 3 \
            "$BACKUP_FILE" \
            "$CHUNKS_DIR/$(basename "$BACKUP_FILE").part-"; then
        echo "Не удалось разделить бэкап на части для Telegram."
        exit 1
    fi
    FILES_TO_SEND=("$CHUNKS_DIR"/*)
fi

echo "Отправка бэкапа в Telegram (${#FILES_TO_SEND[@]} файл(а/ов))..."
for file_path in "${FILES_TO_SEND[@]}"; do
    if ! send_to_telegram "$file_path"; then
        echo "Ошибка отправки файла $(basename "$file_path") в Telegram."
        exit 1
    fi
done

echo "Бэкап успешно отправлен в Telegram."
