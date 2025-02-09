FROM node:20 AS build

# Устанавливаем рабочую директорию
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM nginx:1.15.2-alpine

COPY --from=build /app/public /var/www
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
ENTRYPOINT ["nginx","-g","daemon off;"]
