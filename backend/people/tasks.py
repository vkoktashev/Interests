from celery import shared_task

from integrations.tmdb import TmdbIntegrationError
from people.functions import fetch_and_upsert_person


@shared_task
def refresh_person_details(tmdb_id):
    try:
        fetch_and_upsert_person(tmdb_id)
    except TmdbIntegrationError:
        return None
    return None
