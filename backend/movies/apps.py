from django.apps import AppConfig


class MoviesAppConfig(AppConfig):
    name = 'movies'
    verbose_name = 'Фильмы'

    def ready(self):
        import movies.signals
