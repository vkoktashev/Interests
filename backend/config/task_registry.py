from django.utils.module_loading import import_string

from config.task_schedule import get_periodic_task_schedule_label


TASK_DEFINITIONS = {
    'update_upcoming_games': {
        'name': 'Обновление будущих игр',
        'description': 'Обновляет данные будущих игр, студии, магазины, медиа и время прохождения.',
        'schedule': get_periodic_task_schedule_label('update_upcoming_games'),
        'task_path': 'games.tasks.update_upcoming_games',
    },
    'update_upcoming_movies': {
        'name': 'Обновление будущих фильмов',
        'description': 'Обновляет данные фильмов, включая даты обычного и цифрового релиза.',
        'schedule': get_periodic_task_schedule_label('update_upcoming_movies'),
        'task_path': 'movies.tasks.update_upcoming_movies',
    },
    'update_shows': {
        'name': 'Обновление сериалов',
        'description': 'Обновляет активные и будущие сериалы, сезоны и сведения о новых сериях.',
        'schedule': get_periodic_task_schedule_label('update_shows'),
        'task_path': 'shows.tasks.update_shows',
    },
    'sync_show_cast': {
        'name': 'Синхронизация актеров сериалов',
        'description': 'Загружает из TMDB полный актерский состав и создателей для всех сериалов.',
        'schedule': 'Только вручную',
        'task_path': 'shows.tasks.sync_show_cast',
    },
    'sync_tracked_person_credits': {
        'name': 'Синхронизация работ отслеживаемых людей',
        'description': 'Обновляет фильмы и сериалы отслеживаемых людей для почтовых уведомлений.',
        'schedule': get_periodic_task_schedule_label('sync_tracked_person_credits'),
        'task_path': 'people.tasks.sync_tracked_person_credits',
    },
    'send_release_emails': {
        'name': 'Рассылка уведомлений о релизах',
        'description': 'Отправляет подписчикам письма о сегодняшних релизах. Повторный запуск повторит рассылку.',
        'schedule': get_periodic_task_schedule_label('send_release_emails'),
        'task_path': 'users.tasks.send_release_emails',
    },
    'sync_kinopoisk_top250': {
        'name': 'Синхронизация Топ 250 Кинопоиска',
        'description': 'Обновляет системную подборку, ее порядок и загружает отсутствующие фильмы из TMDB.',
        'schedule': get_periodic_task_schedule_label('sync_kinopoisk_top250'),
        'task_path': 'content_collections.tasks.sync_kinopoisk_top250',
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
