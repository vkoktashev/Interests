from celery import shared_task
from requests import ConnectionError, HTTPError, Timeout

from people.functions import fetch_and_upsert_person


@shared_task
def refresh_person_details(tmdb_id):
    try:
        fetch_and_upsert_person(tmdb_id)
    except (HTTPError, ConnectionError, Timeout, ValueError):
        return None
    return None
