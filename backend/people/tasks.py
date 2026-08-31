from config.celery import app
from people.functions import fetch_and_upsert_person
from utils.celery import ExternalRefreshTask, execute_locked_task


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_person_details(tmdb_id):
    def refresh():
        return fetch_and_upsert_person(tmdb_id).id

    return execute_locked_task('refresh_person_details', tmdb_id, refresh)
