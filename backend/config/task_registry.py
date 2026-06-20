from django.utils.module_loading import import_string

from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE


TASK_DEFINITIONS = {
    'update_upcoming_games': {
        'name': 'Обновление будущих игр',
        'description': 'Обновляет данные будущих игр, студии, магазины, медиа и время прохождения.',
        'schedule': f'Ежедневно в {UPDATE_DATES_HOUR:02d}:{UPDATE_DATES_MINUTE:02d} UTC',
        'task_path': 'games.tasks.update_upcoming_games',
    },
    'update_upcoming_movies': {
        'name': 'Обновление будущих фильмов',
        'description': 'Обновляет данные фильмов, включая даты обычного и цифрового релиза.',
        'schedule': f'Ежедневно в {UPDATE_DATES_HOUR:02d}:{UPDATE_DATES_MINUTE:02d} UTC',
        'task_path': 'movies.tasks.update_upcoming_movies',
    },
    'update_shows': {
        'name': 'Обновление сериалов',
        'description': 'Обновляет активные и будущие сериалы, сезоны и сведения о новых сериях.',
        'schedule': f'Ежедневно в {UPDATE_DATES_HOUR:02d}:{UPDATE_DATES_MINUTE:02d} UTC',
        'task_path': 'shows.tasks.update_shows',
    },
    'send_release_emails': {
        'name': 'Рассылка уведомлений о релизах',
        'description': 'Отправляет подписчикам письма о сегодняшних релизах. Повторный запуск повторит рассылку.',
        'schedule': f'Ежедневно в {UPDATE_DATES_HOUR + 1:02d}:{UPDATE_DATES_MINUTE:02d} UTC',
        'task_path': 'users.tasks.send_release_emails',
    },
}


def get_task_definition(code):
    return TASK_DEFINITIONS.get(code, {})


def enqueue_task(code):
    definition = TASK_DEFINITIONS.get(code)
    if definition is None:
        raise ValueError(f'Unknown scheduled task: {code}')

    task = import_string(definition['task_path'])
    return task.delay()
