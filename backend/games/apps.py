from django.apps import AppConfig


class GamesAppConfig(AppConfig):
    name = 'games'
    verbose_name = 'Игры'

    def ready(self):
        import games.signals
