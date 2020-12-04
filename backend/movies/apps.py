from django.apps import AppConfig


class MoviesAppConfig(AppConfig):
    name = 'movies'

    def ready(self):
        import games.signals
