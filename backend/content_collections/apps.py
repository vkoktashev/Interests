from importlib import import_module

from django.apps import AppConfig


class ContentCollectionsAppConfig(AppConfig):
    name = 'content_collections'
    verbose_name = 'Подборки'

    def ready(self):
        import_module('content_collections.signals')
