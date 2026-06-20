from django.apps import AppConfig


class ShowsAppConfig(AppConfig):
    name = 'shows'
    verbose_name = 'Сериалы'

    def ready(self):
        import shows.signals
