from collections import defaultdict
from itertools import chain

from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import IntegerField, Q, Value

from games.models import GameLog
from games.serializers import GameLogSerializer
from movies.models import MovieLog
from movies.serializers import MovieLogSerializer
from people.models import PersonLog
from people.serializers import PersonLogSerializer
from proxy.functions import get_proxy_url
from shows.models import EpisodeLog, SeasonLog, ShowLog
from shows.serializers import EpisodeLogSerializer, SeasonLogSerializer, ShowLogSerializer
from users.models import User, UserLog
from users.serializers import UserLogSerializer
from users.services.reactions import get_log_reactions
from utils.constants import (
    TYPE_EPISODE,
    TYPE_GAME,
    TYPE_MOVIE,
    TYPE_PERSON,
    TYPE_SEASON,
    TYPE_SHOW,
    TYPE_USER,
)
from utils.functions import get_page_size


class InvalidLogTypeError(Exception):
    pass


class LogNotFoundError(Exception):
    pass


def get_log_model(log_type):
    model = {
        TYPE_GAME: GameLog,
        TYPE_MOVIE: MovieLog,
        TYPE_SHOW: ShowLog,
        TYPE_SEASON: SeasonLog,
        TYPE_EPISODE: EpisodeLog,
        TYPE_USER: UserLog,
        TYPE_PERSON: PersonLog,
    }.get(log_type)
    if model is None:
        raise InvalidLogTypeError
    return model


@transaction.atomic
def delete_user_log(user, log_id, log_type):
    model = get_log_model(log_type)
    try:
        entry = model.objects.select_for_update().get(id=log_id, user=user)
    except model.DoesNotExist as error:
        raise LogNotFoundError from error
    entry.delete()


def serialize_logs(logs, request=None):
    logs = list(logs)
    reactions = get_log_reactions(logs, current_user=getattr(request, 'user', None))
    compact_feed = bool(getattr(getattr(request, 'user', None), 'compact_feed', False))
    results = []
    for entry in logs:
        if isinstance(entry, GameLog):
            serializer = GameLogSerializer(entry)
        elif isinstance(entry, MovieLog):
            serializer = MovieLogSerializer(entry)
        elif isinstance(entry, ShowLog):
            serializer = ShowLogSerializer(entry)
        elif isinstance(entry, SeasonLog):
            serializer = SeasonLogSerializer(entry)
        elif isinstance(entry, EpisodeLog):
            serializer = EpisodeLogSerializer(entry)
        elif isinstance(entry, PersonLog):
            serializer = PersonLogSerializer(entry)
        else:
            serializer = UserLogSerializer(entry)
        data = serializer.data
        data['cover_url'] = '' if compact_feed else get_log_cover_url(entry, request)
        data['reactions'] = reactions[(type(entry), entry.pk)]
        results.append(data)
    return results


def get_log_cover_url(entry, request=None):
    if isinstance(entry, GameLog):
        return entry.game.igdb_cover_url
    if isinstance(entry, MovieLog):
        path = entry.movie.tmdb_poster_path
    elif isinstance(entry, ShowLog):
        path = entry.show.tmdb_poster_path
    elif isinstance(entry, SeasonLog):
        path = entry.season.tmdb_poster_path or entry.season.tmdb_show.tmdb_poster_path
    elif isinstance(entry, EpisodeLog):
        season = entry.episode.tmdb_season
        path = season.tmdb_poster_path or season.tmdb_show.tmdb_poster_path
    elif isinstance(entry, PersonLog):
        path = entry.person.tmdb_profile_path
    else:
        return ''

    return get_proxy_url(request, path) if request is not None else path


# (model, select_related, fields matched by the search query)
FEED_LOG_SOURCES = {
    TYPE_GAME: (
        (GameLog, ('user', 'game'), ('game__igdb_name',)),
    ),
    TYPE_MOVIE: (
        (MovieLog, ('user', 'movie'), ('movie__tmdb_name', 'movie__tmdb_original_name')),
    ),
    TYPE_SHOW: (
        (ShowLog, ('user', 'show'), ('show__tmdb_name', 'show__tmdb_original_name')),
        (SeasonLog, ('user', 'season__tmdb_show'),
         ('season__tmdb_show__tmdb_name', 'season__tmdb_show__tmdb_original_name')),
        (EpisodeLog, ('user', 'episode__tmdb_season__tmdb_show'),
         ('episode__tmdb_season__tmdb_show__tmdb_name', 'episode__tmdb_season__tmdb_show__tmdb_original_name')),
    ),
    TYPE_USER: (
        (UserLog, ('user', 'followed_user'), ('followed_user__username',)),
    ),
    TYPE_PERSON: (
        (PersonLog, ('user', 'person'), ('person__name',)),
    ),
}


def get_logs(user_query, page_size, page_number, search_query, filters, request=None):
    page_size = get_page_size(page_size)

    sources = list(chain.from_iterable(FEED_LOG_SOURCES[key] for key in FEED_LOG_SOURCES if key in filters))
    if not sources:
        return [], 0

    # Sort and paginate lightweight (source, id, created) rows in the database,
    # then load full objects only for the requested page.
    keys_querysets = []
    for index, (model, _, search_fields) in enumerate(sources):
        queryset = model.objects.filter(user__in=user_query)
        if search_query:
            search = Q()
            for field in search_fields:
                search |= Q(**{f'{field}__icontains': search_query})
            queryset = queryset.filter(search)
        keys_querysets.append(
            queryset.annotate(source=Value(index, output_field=IntegerField())).values_list('id', 'created', 'source')
        )
    union_keys = keys_querysets[0].union(*keys_querysets[1:], all=True).order_by('-created', 'source', '-id')

    paginator = Paginator(union_keys, page_size)
    page_keys = list(paginator.get_page(page_number).object_list)

    ids_by_source = defaultdict(list)
    for log_id, _, source in page_keys:
        ids_by_source[source].append(log_id)
    entries = {}
    for source, ids in ids_by_source.items():
        model, select_related, _ = sources[source]
        for log_id, entry in model.objects.select_related(*select_related).in_bulk(ids).items():
            entries[(source, log_id)] = entry
    logs = [entries[(source, log_id)] for log_id, _, source in page_keys if (source, log_id) in entries]

    return serialize_logs(logs, request=request), paginator.count


def get_user_by_id(user_id, current_user):
    try:
        user_id = int(user_id)
    except ValueError:
        raise ValueError()

    if current_user.pk == user_id:
        return current_user

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise User.DoesNotExist()

    return user
