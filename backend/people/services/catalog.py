from datetime import timedelta

from django.utils import timezone

from integrations.tmdb import TmdbNotFoundError, TmdbUnavailableError
from people.functions import fetch_and_upsert_person
from people.models import Person
from people.tasks import refresh_person_details
from utils.celery import enqueue_background_task_once


PERSON_DETAILS_REFRESH_INTERVAL = timedelta(days=7)


class PersonNotFoundError(Exception):
    pass


def get_person_by_id(person_id):
    try:
        person_id = int(person_id)
    except (TypeError, ValueError) as error:
        raise PersonNotFoundError from error

    person = Person.objects.filter(id=person_id).first()
    if person is None:
        raise PersonNotFoundError
    return _sync_person_if_needed(person, person.tmdb_id)


def get_person_by_tmdb_id(tmdb_id):
    try:
        tmdb_id = int(tmdb_id)
    except (TypeError, ValueError) as error:
        raise PersonNotFoundError from error

    person = Person.objects.filter(tmdb_id=tmdb_id).first()
    return _sync_person_if_needed(person, tmdb_id)


def person_refresh_is_due(person):
    return bool(
        person.tmdb_last_update and
        person.tmdb_last_update <= timezone.now() - PERSON_DETAILS_REFRESH_INTERVAL
    )


def enqueue_person_refresh(tmdb_id):
    return enqueue_background_task_once(
        refresh_person_details,
        identity=tmdb_id,
        args=(tmdb_id,),
        task_name='refresh_person_details',
    )


def _sync_person_if_needed(person, tmdb_id):
    if person is not None and person.tmdb_last_update is not None:
        return person

    try:
        return fetch_and_upsert_person(tmdb_id)
    except TmdbNotFoundError as error:
        raise PersonNotFoundError from error
