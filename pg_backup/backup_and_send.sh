#!/bin/bash

set -eo pipefail

# Values in /etc/environment are not shell-safe (e.g. SECRET_KEY), so read it as data.
while IFS= read -r line || [ -n "$line" ]; do
    key=${line%%=*}
    if [ "$key" != "$line" ] && [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && [ -z "${!key+x}" ]; then
        export "$key=${line#*=}"
    fi
done < /etc/environment

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
TELEGRAM_FALLBACK_API_URL=${TELEGRAM_FALLBACK_API_URL:-https://api.telegram.org}
TELEGRAM_FALLBACK_UPLOAD_LIMIT=${TELEGRAM_FALLBACK_UPLOAD_LIMIT:-49000000}

if ! [[ "$TELEGRAM_UPLOAD_LIMIT" =~ ^[1-9][0-9]*$ ]] ||
    ! [[ "$TELEGRAM_FALLBACK_UPLOAD_LIMIT" =~ ^[1-9][0-9]*$ ]] ||
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

remove_chunks() {
    if [ -n "$CHUNKS_DIR" ]; then
        rm -rf "$CHUNKS_DIR"
        CHUNKS_DIR=""
    fi
}

cleanup() {
    rm -f "$RESPONSE_FILE"
    remove_chunks
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

BACKUP_SIZE=$(stat -c %s "$BACKUP_FILE")

check_api() {
    local api_url="$1"

    curl --silent --fail --connect-timeout 15 --max-time 60 --output /dev/null \
        "${api_url%/}/bot$TELEGRAM_TOKEN/getMe"
}

send_to_telegram() {
    local api_url="$1"
    local local_files="$2"
    local file_path="$3"
    local status
    local document_args=(-F "document=@$file_path")

    if [ "$local_files" = "1" ]; then
        document_args=(--form-string "document=file://$file_path")
    fi

    # Do not retry on the same API: a lost response can follow a successful upload.
    if ! status=$(curl --silent --show-error \
        --connect-timeout 15 --max-time "$TELEGRAM_SEND_TIMEOUT" \
        --form-string "chat_id=$CHAT_ID" \
        "${document_args[@]}" \
        --output "$RESPONSE_FILE" --write-out '%{http_code}' \
        "${api_url%/}/bot$TELEGRAM_TOKEN/sendDocument"); then
        echo "Ошибка соединения с Telegram."
        return 1
    fi

    if [ "$status" != "200" ] || ! jq -e '.ok == true and (.result.message_id | type == "number")' "$RESPONSE_FILE" >/dev/null; then
        echo "Telegram отклонил отправку (HTTP $status)."
        return 1
    fi

    echo "Файл $(basename "$file_path") отправлен; message_id=$(jq -r '.result.message_id' "$RESPONSE_FILE")."
}

send_backup() {
    local api_url="$1"
    local upload_limit="$2"
    local local_files="$3"
    local files_to_send
    local file_path

    if [ "$BACKUP_SIZE" -le "$upload_limit" ]; then
        files_to_send=("$BACKUP_FILE")
    else
        # Parts must also be visible in the API container at the same absolute path.
        CHUNKS_DIR=$(mktemp -d "$BACKUP_DIR/.telegram-parts.XXXXXX") || return 1
        chmod 755 "$CHUNKS_DIR"
        split -b "$upload_limit" -d -a 3 \
            "$BACKUP_FILE" "$CHUNKS_DIR/$(basename "$BACKUP_FILE").part-" || return 1
        files_to_send=("$CHUNKS_DIR"/*)
    fi

    echo "Отправка бэкапа через ${api_url%/} (${#files_to_send[@]} файл(а/ов), $BACKUP_SIZE байт)..."
    for file_path in "${files_to_send[@]}"; do
        if ! send_to_telegram "$api_url" "$local_files" "$file_path"; then
            echo "Ошибка отправки файла $(basename "$file_path") в Telegram."
            remove_chunks
            return 1
        fi
    done

    remove_chunks
}

if check_api "$TELEGRAM_API_URL" &&
    send_backup "$TELEGRAM_API_URL" "$TELEGRAM_UPLOAD_LIMIT" "$TELEGRAM_LOCAL_FILES"; then
    echo "Бэкап успешно отправлен в Telegram."
    exit 0
fi

if [ "${TELEGRAM_API_URL%/}" = "${TELEGRAM_FALLBACK_API_URL%/}" ]; then
    echo "Отправка не удалась. Архив сохранён: $BACKUP_FILE"
    exit 1
fi

# A timed-out upload may still have arrived, so the fallback can duplicate it.
echo "Основной Bot API недоступен или отправка не удалась; резервная отправка через ${TELEGRAM_FALLBACK_API_URL%/}."
if send_backup "$TELEGRAM_FALLBACK_API_URL" "$TELEGRAM_FALLBACK_UPLOAD_LIMIT" 0; then
    echo "Бэкап успешно отправлен в Telegram через резервный API."
    exit 0
fi

echo "Резервная отправка не удалась. Архив сохранён: $BACKUP_FILE"
exit 1
