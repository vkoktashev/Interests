from games.models import Game
from movies.models import Movie
from shows.models import Show
from utils.constants import TYPE_GAME, TYPE_MOVIE, TYPE_SHOW


MEDIA_CONFIG = {
    TYPE_GAME: (Game, 'games'),
    TYPE_MOVIE: (Movie, 'movies'),
    TYPE_SHOW: (Show, 'shows'),
}


def get_media_item(media_type, object_id):
    config = MEDIA_CONFIG.get(media_type)
    if config is None:
        return None, None, 'Неизвестный тип контента.'

    try:
        object_id = int(object_id)
    except (TypeError, ValueError):
        return None, None, 'Некорректный идентификатор контента.'

    model, relation_name = config
    item = model.objects.filter(pk=object_id).first()
    if item is None:
        return None, None, 'Контент не найден.'
    return item, relation_name, None


def get_collection_content_keys(collection):
    media_groups = (
        [(TYPE_GAME, game.pk) for game in collection.games.all()],
        [(TYPE_MOVIE, movie.pk) for movie in collection.movies.all()],
        [(TYPE_SHOW, show.pk) for show in collection.shows.all()],
    )
    content_keys = []
    item_index = 0
    while any(item_index < len(group) for group in media_groups):
        for group in media_groups:
            if item_index < len(group):
                content_keys.append(group[item_index])
        item_index += 1
    return content_keys
