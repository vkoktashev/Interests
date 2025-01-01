#!/bin/bash

# Конфигурация
DB_NAME=${DB_NAME:-"test_db"}          # Имя базы данных
DB_USER=${DB_USER:-"postgres"}        # Пользователь базы
DB_PASSWORD=${DB_PASSWORD:-"password"} # Пароль пользователя
DB_HOST=db2  # Имя или адрес контейнера с базой данных
TELEGRAM_TOKEN=${TELEGRAM_TOKEN}      # Токен Telegram бота
CHAT_ID=${CHAT_ID}                    # ID чата или пользователя Telegram
BACKUP_DIR="/app/backups"             # Директория для хранения бэкапов

echo $DB_PASSWORD

# Создаём директорию для бэкапов (если её нет)
mkdir -p "$BACKUP_DIR"

# Текущая дата для имени файла
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"

# Экспорт переменной окружения для pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Создание бэкапа базы данных
echo "Создание бэкапа базы данных..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F c -f "$BACKUP_FILE"

# Проверяем успешность создания бэкапа
if [ $? -ne 0 ]; then
    echo "Ошибка создания бэкапа базы данных."
    exit 1
fi

echo "Бэкап создан: $BACKUP_FILE"

# Отправка бэкапа в Telegram
echo "Отправка бэкапа в Telegram..."
curl -F chat_id="$CHAT_ID" -F document=@"$BACKUP_FILE" "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendDocument"

# Проверяем успешность отправки
if [ $? -eq 0 ]; then
    echo "Бэкап успешно отправлен в Telegram."
else
    echo "Ошибка отправки бэкапа в Telegram."
    exit 1
fi
