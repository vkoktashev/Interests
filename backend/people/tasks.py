import logging

from config.celery import app
from people.functions import clear_tmdb_person_credits_cache, fetch_and_upsert_person
from people.models import Person
from people.services.credits import sync_person_credits
from utils.celery import ExternalRefreshTask, enqueue_background_task_once, execute_locked_task

logger = logging.getLogger(__name__)

PERSON_CREDITS_TASK_RATE_LIMIT = '20/m'


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_person_details(tmdb_id):
    def refresh():
        return fetch_and_upsert_person(tmdb_id).id

    return execute_locked_task('refresh_person_details', tmdb_id, refresh)


@app.task(
    base=ExternalRefreshTask,
    ignore_result=True,
    rate_limit=PERSON_CREDITS_TASK_RATE_LIMIT,
)
def refresh_person_credits(person_id, force=False):
    def refresh():
        person = Person.objects.get(pk=person_id)
        if force:
            clear_tmdb_person_credits_cache(person.tmdb_id)
        return sync_person_credits(person)

    return execute_locked_task('refresh_person_credits', person_id, refresh)


@app.task
def sync_tracked_person_credits():
    return execute_locked_task(
        'sync_tracked_person_credits',
        'all',
        _enqueue_tracked_person_credit_refreshes,
        timeout=60 * 60,
    )


def _enqueue_tracked_person_credit_refreshes():
    person_ids = Person.objects.filter(
        tracked_by_users__user__receive_people_releases=True,
    ) \
        .values_list('id', flat=True).distinct().order_by('id')
    candidates_count = person_ids.count()
    scheduled_count = 0
    skipped_count = 0

    for person_id in person_ids.iterator(chunk_size=200):
        is_queued = enqueue_background_task_once(
            refresh_person_credits,
            identity=person_id,
            args=(person_id,),
            kwargs={'force': True},
            task_name='refresh_person_credits',
        )
        if is_queued:
            scheduled_count += 1
        else:
            skipped_count += 1

    logger.info(
        'sync_tracked_person_credits: finish candidates=%s scheduled=%s skipped=%s',
        candidates_count,
        scheduled_count,
        skipped_count,
    )
    return {
        'candidates': candidates_count,
        'scheduled': scheduled_count,
        'skipped': skipped_count,
    }
