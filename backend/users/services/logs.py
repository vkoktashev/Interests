from itertools import chain

from django.core.paginator import Paginator
from django.db.models import Q

from games.models import GameLog
from games.serializers import GameLogSerializer
from movies.models import MovieLog
from movies.serializers import MovieLogSerializer
from people.models import PersonLog
from people.serializers import PersonLogSerializer
from shows.models import EpisodeLog, SeasonLog, ShowLog
from shows.serializers import EpisodeLogSerializer, SeasonLogSerializer, ShowLogSerializer
from users.models import User, UserLog
from users.serializers import UserLogSerializer
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


def delete_user_log(user, log_id, log_type):
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

    try:
        entry = model.objects.get(id=log_id, user=user)
    except model.DoesNotExist as error:
        raise LogNotFoundError from error
    entry.delete()


def serialize_logs(logs):
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
        results.append(serializer.data)
    return results


def get_logs(user_query, page_size, page_number, search_query, filters):
    page_size = get_page_size(page_size)
    page = page_number

    game_logs = movie_logs = show_logs = season_logs = episode_logs = user_logs = person_logs = []

    for user_filter in filters:
        if user_filter == TYPE_GAME:
            game_logs = GameLog.objects.select_related('user', 'game') \
                .filter(user__in=user_query) \
                .filter(Q(game__igdb_name__icontains=search_query))
        elif user_filter == TYPE_MOVIE:
            movie_logs = MovieLog.objects.select_related('user', 'movie').filter(user__in=user_query) \
                .filter(Q(movie__tmdb_name__icontains=search_query) |
                        Q(movie__tmdb_original_name__icontains=search_query))
        elif user_filter == TYPE_SHOW:
            show_logs = ShowLog.objects.select_related('user', 'show').filter(user__in=user_query) \
                .filter(Q(show__tmdb_name__icontains=search_query) |
                        Q(show__tmdb_original_name__icontains=search_query))
            season_logs = SeasonLog.objects.select_related('user', 'season__tmdb_show').filter(user__in=user_query) \
                .filter(Q(season__tmdb_show__tmdb_name__icontains=search_query) |
                        Q(season__tmdb_show__tmdb_original_name__icontains=search_query))
            episode_logs = EpisodeLog.objects.select_related(
                'user', 'episode', 'episode__tmdb_season',
                'episode__tmdb_season__tmdb_show'
            ).filter(user__in=user_query) \
                .filter(Q(episode__tmdb_season__tmdb_show__tmdb_name__icontains=search_query) |
                        Q(episode__tmdb_season__tmdb_show__tmdb_original_name__icontains=search_query))
        elif user_filter == TYPE_USER:
            user_logs = UserLog.objects.select_related('user', 'followed_user').filter(user__in=user_query) \
                .filter(followed_user__username__icontains=search_query)
        elif user_filter == TYPE_PERSON:
            person_logs = PersonLog.objects.select_related('user', 'person').filter(user__in=user_query) \
                .filter(person__name__icontains=search_query)

    union_logs = sorted(chain(
        game_logs, movie_logs, show_logs, season_logs, episode_logs, user_logs, person_logs,
    ),
                        key=lambda obj: obj.created, reverse=True)

    paginator = Paginator(union_logs, page_size)
    paginator_page = paginator.get_page(page)

    results = serialize_logs(paginator_page.object_list)
    return results, paginator.count


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
