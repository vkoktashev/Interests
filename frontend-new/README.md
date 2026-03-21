# Frontend

## Разработка

Установка зависимостей:
```shell
yarn
```

Запуск в режиме разработки (hot reload):
```shell
yarn watch
```

Приложение будет доступно по адресу: http://localhost:9991/

### Включение eslint в IDE

Для WebStorm/PhpStorm идем в `Настройки` -> `Languages & Frameworks` -> `Code Quality Tools` -> `ESLint`

И включаем там пункты `Automatic ESLint configuration` и `Run eslint --fix on save`

Production-сборка запускается из корня репозитория скриптом `./build-frontend.sh`.
