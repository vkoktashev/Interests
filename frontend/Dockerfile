# Этап сборки
FROM node:16-alpine as build

# Установим рабочую директорию для сборки
WORKDIR /app

# Копируем package.json и package-lock.json (если он есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код приложения
COPY . .

# Строим приложение React
RUN npm run build

# Этап с Nginx для деплоя
FROM nginx:1.15.2-alpine

# Копируем файлы из предыдущего этапа сборки в nginx
COPY --from=build /app/build /usr/share/nginx/html

# Копируем кастомный конфиг для Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
ENTRYPOINT ["nginx", "-g", "daemon off;"]
