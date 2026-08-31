from config.celery import app
from utils.celery import ExternalRefreshTask, execute_locked_task

from content_collections.services.kinopoisk_top250 import (
    KINOPOISK_TOP250_SYSTEM_KEY,
    sync_kinopoisk_top250 as sync_kinopoisk_top250_service,
)


KINOPOISK_TOP250_TASK_TIMEOUT = 60 * 60 * 4


@app.task(base=ExternalRefreshTask, ignore_result=True)
def sync_kinopoisk_top250():
    return execute_locked_task(
        'sync_kinopoisk_top250',
        KINOPOISK_TOP250_SYSTEM_KEY,
        sync_kinopoisk_top250_service,
        timeout=KINOPOISK_TOP250_TASK_TIMEOUT,
    )
