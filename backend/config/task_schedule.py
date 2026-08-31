from celery.schedules import crontab

PERIODIC_TASKS = {
    'update_upcoming_games': {
        'task': 'games.tasks.update_upcoming_games',
        'hour': 3,
        'minute': 0,
    },
    'update_upcoming_movies': {
        'task': 'movies.tasks.update_upcoming_movies',
        'hour': 3,
        'minute': 20,
    },
    'update_shows': {
        'task': 'shows.tasks.update_shows',
        'hour': 3,
        'minute': 40,
    },
    'send_release_emails': {
        'task': 'users.tasks.send_release_emails',
        'hour': 9,
        'minute': 0,
    },
}


def get_periodic_task_time(code):
    definition = PERIODIC_TASKS[code]
    return definition['hour'], definition['minute']


def get_periodic_task_schedule_label(code):
    hour, minute = get_periodic_task_time(code)
    return f'Ежедневно в {hour:02d}:{minute:02d} МСК'


def build_celery_beat_schedule():
    schedule = {}
    for code, definition in PERIODIC_TASKS.items():
        hour, minute = get_periodic_task_time(code)
        schedule[code] = {
            'task': definition['task'],
            'schedule': crontab(hour=hour, minute=minute),
        }
    return schedule
