#!/bin/bash

set -eo pipefail

source /etc/environment

DB_NAME=${DB_NAME:-"test_db"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"password"}
DB_HOST=${DB_HOST:-db2}
: "${TELEGRAM_TOKEN:?TELEGRAM_TOKEN is required}"
: "${CHAT_ID:?CHAT_ID is required}"
BACKUP_DIR="/app/backups"
TELEGRAM_API_URL=${TELEGRAM_API_URL:-https://api.telegram.org}
TELEGRAM_UPLOAD_LIMIT=${TELEGRAM_UPLOAD_LIMIT:-49000000}
TELEGRAM_LOCAL_FILES=${TELEGRAM_LOCAL_FILES:-0}
TELEGRAM_SEND_TIMEOUT=${TELEGRAM_SEND_TIMEOUT:-3600}

if ! [[ "$TELEGRAM_UPLOAD_LIMIT" =~ ^[1-9][0-9]*$ ]] ||
    ! [[ "$TELEGRAM_SEND_TIMEOUT" =~ ^[1-9][0-9]*$ ]] ||
    ! [[ "$TELEGRAM_LOCAL_FILES" =~ ^[01]$ ]]; then
    echo "Некорректные настройки отправки Telegram."
    exit 1
fi

if [ "$#" -ne 0 ] && { [ "$#" -ne 2 ] || [ "$1" != "--send-existing" ]; }; then
    echo "Использование: $0 [--send-existing /app/backups/archive.sql.gz]"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/.backup.lock"
if ! flock -n 9; then
    echo "Бэкап или деплой уже выполняется; повторный запуск отменён."
    exit 1
fi

# Local Bot API runs as a different user and needs read access to archives.
umask 022
CHUNKS_DIR=""
RESPONSE_FILE=$(mktemp)

cleanup() {
    rm -f "$RESPONSE_FILE"
    if [ -n "$CHUNKS_DIR" ]; then
        rm -rf "$CHUNKS_DIR"
    fi
}

trap cleanup EXIT

if [ "$#" -eq 2 ]; then
    BACKUP_FILE=$(readlink -f -- "$2")
    if [[ "$BACKUP_FILE" != "$BACKUP_DIR/"* ]] || [ ! -s "$BACKUP_FILE" ]; then
        echo "Архив должен быть непустым файлом внутри $BACKUP_DIR."
        exit 1
    fi
else
    TIMESTAMP=$(date +"%Y_%m_%d")
    BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"
    export PGPASSWORD="$DB_PASSWORD"

    echo "Создание и сжатие бэкапа базы данных..."
    if ! pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F p | gzip -9 > "$BACKUP_FILE"; then
        rm -f "$BACKUP_FILE"
        echo "Ошибка создания бэкапа базы данных."
        exit 1
    fi
    unset PGPASSWORD
    echo "Бэкап создан: $BACKUP_FILE"
fi

send_to_telegram() {
    local file_path="$1"
    local status
    local document_args=(-F "document=@$file_path")

    if [ "$TELEGRAM_LOCAL_FILES" = "1" ]; then
        document_args=(--form-string "document=file://$file_path")
    fi

    # Do not retry automatically: a lost response can follow a successful upload.
    if ! status=$(curl --silent --show-error \
        --connect-timeout 15 --max-time "$TELEGRAM_SEND_TIMEOUT" \
        --form-string "chat_id=$CHAT_ID" \
        "${document_args[@]}" \
        --output "$RESPONSE_FILE" --write-out '%{http_code}' \
        "${TELEGRAM_API_URL%/}/bot$TELEGRAM_TOKEN/sendDocument"); then
        echo "Ошибка соединения с Telegram; проверьте чат перед повторной отправкой."
        return 1
    fi

    if [ "$status" != "200" ] || ! jq -e '.ok == true and (.result.message_id | type == "number")' "$RESPONSE_FILE" >/dev/null; then
        echo "Telegram отклонил отправку (HTTP $status)."
        return 1
    fi

    echo "Файл $(basename "$file_path") отправлен; message_id=$(jq -r '.result.message_id' "$RESPONSE_FILE")."
}

BACKUP_SIZE=$(stat -c %s "$BACKUP_FILE")
if [ "$BACKUP_SIZE" -le "$TELEGRAM_UPLOAD_LIMIT" ]; then
    FILES_TO_SEND=("$BACKUP_FILE")
else
    # Parts must also be visible in the API container at the same absolute path.
    CHUNKS_DIR=$(mktemp -d "$BACKUP_DIR/.telegram-parts.XXXXXX")
    chmod 755 "$CHUNKS_DIR"
    split -b "$TELEGRAM_UPLOAD_LIMIT" -d -a 3 \
        "$BACKUP_FILE" "$CHUNKS_DIR/$(basename "$BACKUP_FILE").part-"
    FILES_TO_SEND=("$CHUNKS_DIR"/*)
fi

echo "Отправка бэкапа в Telegram (${#FILES_TO_SEND[@]} файл(а/ов), $BACKUP_SIZE байт)..."
for file_path in "${FILES_TO_SEND[@]}"; do
    if ! send_to_telegram "$file_path"; then
        echo "Ошибка отправки файла $(basename "$file_path") в Telegram. Архив сохранён: $BACKUP_FILE"
        exit 1
    fi
done

echo "Бэкап успешно отправлен в Telegram."
