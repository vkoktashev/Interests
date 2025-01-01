# Используем официальный образ PostgreSQL
FROM postgres:16

# Устанавливаем необходимые утилиты (curl для Telegram API)
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем скрипт в контейнер
COPY backup_and_send.sh /app/backup_and_send.sh

# Делаем скрипт исполняемым
RUN chmod +x /app/backup_and_send.sh

# Задаем скрипт как точку входа
ENTRYPOINT ["/app/backup_and_send.sh"]
