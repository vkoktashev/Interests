from datetime import date


def get_hltb_game_key(game_name):
    return f'hltb_search_{game_name.replace(" ", "_")}'


def is_game_released(game, today=None):
    release_date_format = getattr(game, 'igdb_release_date_format', None)
    tbd_release_date_format = getattr(game, 'IGDB_RELEASE_DATE_FORMAT_TBD', None)
    release_date_display = str(getattr(game, 'igdb_release_date_display', '') or '')

    if tbd_release_date_format is not None and release_date_format == tbd_release_date_format:
        return False

    release_date = getattr(game, 'igdb_release_date', None)
    if release_date:
        today_date = today or date.today()
        return release_date <= today_date

    return release_date_display.strip().upper() not in ('TBA', 'TBD')


def format_game_release_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value.strftime('%d.%m.%Y')
    if isinstance(value, str):
        try:
            return date.fromisoformat(value).strftime('%d.%m.%Y')
        except ValueError:
            return None
    return None


def get_game_release_date_display(game):
    release_date_display = getattr(game, 'igdb_release_date_display', '')
    if release_date_display:
        return release_date_display
    return format_game_release_date(getattr(game, 'igdb_release_date', None))
