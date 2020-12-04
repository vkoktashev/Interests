from django.apps import AppConfig


class UsersAppConfig(AppConfig):
    name = 'users'

    def ready(self):
        import users.signals
