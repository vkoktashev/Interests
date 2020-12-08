from django.apps import AppConfig


class ShowsAppConfig(AppConfig):
    name = 'shows'

    def ready(self):
        import shows.signals
