# Используем официальный образ PostgreSQL
FROM postgres:16

# Устанавливаем необходимые пакеты
RUN apt-get update && apt-get install -y cron curl && rm -rf /var/lib/apt/lists/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем скрипт для бэкапа
COPY backup_and_send.sh /app/backup_and_send.sh

# Делаем скрипт исполняемым
RUN chmod +x /app/backup_and_send.sh

# Копируем файл crontab
COPY crontab /etc/cron.d/pg_backup_cron

# Устанавливаем права доступа на файл crontab
RUN chmod 0644 /etc/cron.d/pg_backup_cron

# Добавляем crontab в cron
RUN crontab /etc/cron.d/pg_backup_cron

# Создаем директорию для бэкапов
RUN mkdir -p /app/backups

# Запускаем cron и ждём, чтобы контейнер не завершился
CMD printenv | grep -v "no_proxy" >> /etc/environment && cron -f
