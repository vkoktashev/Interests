from datetime import date

from django.db import transaction
from django.utils import timezone

from people.functions import get_tmdb_person_movie_credits, get_tmdb_person_tv_credits
from people.models import Person, PersonCredit


MOVIE_CREW_ROLES_BY_JOB = {
    'Director': PersonCredit.ROLE_DIRECTOR,
}
SHOW_CREW_ROLES_BY_JOB = {
    'Director': PersonCredit.ROLE_DIRECTOR,
    'Creator': PersonCredit.ROLE_CREATOR,
}
ROLE_ORDER = (
    PersonCredit.ROLE_ACTOR,
    PersonCredit.ROLE_DIRECTOR,
    PersonCredit.ROLE_CREATOR,
)


def sync_person_credits(person):
    movie_credits = get_tmdb_person_movie_credits(person.tmdb_id)
    show_credits = get_tmdb_person_tv_credits(person.tmdb_id)
    credits = _collect_credits(movie_credits, show_credits)
    credit_keys = set()

    with transaction.atomic():
        person = Person.objects.select_for_update().get(pk=person.pk)
        for credit in credits:
            credit_key = (credit['media_type'], credit['tmdb_id'])
            credit_keys.add(credit_key)
            PersonCredit.objects.update_or_create(
                person=person,
                media_type=credit['media_type'],
                tmdb_id=credit['tmdb_id'],
                defaults={
                    'name': credit['name'],
                    'release_date': credit['release_date'],
                    'roles': credit['roles'],
                },
            )

        existing_credits = PersonCredit.objects.filter(person=person)
        obsolete_credit_ids = [
            credit.id
            for credit in existing_credits.only('id', 'media_type', 'tmdb_id')
            if (credit.media_type, credit.tmdb_id) not in credit_keys
        ]
        PersonCredit.objects.filter(id__in=obsolete_credit_ids).delete()

        person.tmdb_credits_last_update = timezone.now()
        person.save(update_fields=('tmdb_credits_last_update',))

    return len(credits)


def _collect_credits(movie_credits, show_credits):
    credits = {}
    _add_media_credits(
        credits,
        movie_credits,
        PersonCredit.MEDIA_TYPE_MOVIE,
        'title',
        'release_date',
        MOVIE_CREW_ROLES_BY_JOB,
    )
    _add_media_credits(
        credits,
        show_credits,
        PersonCredit.MEDIA_TYPE_SHOW,
        'name',
        'first_air_date',
        SHOW_CREW_ROLES_BY_JOB,
    )
    return list(credits.values())


def _add_media_credits(credits, payload, media_type, name_key, release_date_key, crew_roles_by_job):
    for item in payload.get('cast') or []:
        _add_credit(
            credits,
            item,
            media_type,
            name_key,
            release_date_key,
            PersonCredit.ROLE_ACTOR,
        )

    for item in payload.get('crew') or []:
        role = crew_roles_by_job.get(item.get('job'))
        if role:
            _add_credit(credits, item, media_type, name_key, release_date_key, role)


def _add_credit(credits, item, media_type, name_key, release_date_key, role):
    tmdb_id = item.get('id')
    if not isinstance(tmdb_id, int) or tmdb_id <= 0:
        return

    credit_key = (media_type, tmdb_id)
    credit = credits.get(credit_key)
    if credit is None:
        credit = {
            'media_type': media_type,
            'tmdb_id': tmdb_id,
            'name': item.get(name_key) or 'Без названия',
            'release_date': _parse_release_date(item.get(release_date_key)),
            'roles': [],
        }
        credits[credit_key] = credit

    if role not in credit['roles']:
        credit['roles'].append(role)
        credit['roles'].sort(key=ROLE_ORDER.index)


def _parse_release_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return None
