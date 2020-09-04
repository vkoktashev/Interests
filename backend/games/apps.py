from django.apps import AppConfig


class GamesAppConfig(AppConfig):
    name = 'games'

    def ready(self):
        import games.signals
