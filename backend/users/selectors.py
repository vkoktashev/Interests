import collections
import random
from datetime import datetime
from itertools import chain

from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Case, Count, DecimalField, ExpressionWrapper, F, IntegerField, Q, Sum, When
from django.db.models.functions import Coalesce

from games.models import Game, UserGame
from games.serializers import GameSerializer, GameStatsSerializer, TypedGameSerializer
from movies.models import Movie, MoviePerson, UserMovie
from movies.serializers import MovieSerializer, MovieStatsSerializer, TypedMovieSerializer
from people.models import UserPerson
from proxy.functions import get_proxy_url
from shows.models import Episode, EpisodePerson, SeasonPerson, Show, ShowPerson, UserShow
from shows.serializers import EpisodeShowSerializer, ShowStatsSerializer, TypedShowSerializer
from users.functions import is_user_available
from users.models import User, UserFollow
from users.serializers import UserInfoSerializer, UserSerializer
from utils.constants import MINUTES_IN_HOUR, TYPE_MOVIE, TYPE_SHOW
from utils.models import Round


class InvalidRandomCountError(Exception):
    pass


def get_user_profile_payload(request, user):
    is_available = is_user_available(request.user, user)
    if not is_available:
        return {'username': user.username, 'is_available': False}

    try:
        is_followed = UserFollow.objects.get(
            user=request.user,
            followed_user=user,
        ).is_following
    except (UserFollow.DoesNotExist, TypeError):
        is_followed = False

    user_games = UserGame.objects.select_related('game') \
        .exclude(status=UserGame.STATUS_NOT_PLAYED) \
        .filter(user=user).order_by('-updated_at')
    user_movies = UserMovie.objects.select_related('movie') \
        .exclude(status=UserMovie.STATUS_NOT_WATCHED) \
        .filter(user=user).order_by('-updated_at')
    user_shows = _get_user_shows(user)

    viewer_movies = []
    viewer_shows = []
    if request.user.is_authenticated:
        if request.user == user:
            viewer_movies = user_movies
            viewer_shows = user_shows
        else:
            viewer_movies = UserMovie.objects.select_related('movie') \
                .exclude(status=UserMovie.STATUS_NOT_WATCHED) \
                .filter(user=request.user).order_by('-updated_at')
            viewer_shows = UserShow.objects.select_related('show') \
                .exclude(status=UserShow.STATUS_NOT_WATCHED) \
                .filter(user=request.user).order_by('-updated_at')

    payload = {
        'is_available': True,
        'is_followed': is_followed,
        'followed_users': User.objects.filter(
            id__in=UserFollow.objects.filter(user=user, is_following=True).values('followed_user')
        ).values('id', 'username', 'gender'),
        'tracked_people': _get_tracked_people(request, user, viewer_movies, viewer_shows),
        'games': GameStatsSerializer(user_games, many=True).data,
        'movies': MovieStatsSerializer(user_movies, many=True, context={'request': request}).data,
        'shows': ShowStatsSerializer(user_shows, many=True, context={'request': request}).data,
    }
    payload.update(UserInfoSerializer(user).data)
    return payload


def get_release_calendar(request, user=None):
    today = datetime.today().date()
    calendar = collections.defaultdict(dict)
    games = Game.objects.annotate(release_date=F('igdb_release_date')) \
        .filter(release_date__gte=today)
    movies = Movie.objects.filter(
        Q(tmdb_release_date__gte=today) | Q(tmdb_digital_release_date__gte=today)
    )
    shows = Show.objects.all()

    if user is not None:
        games = games.filter(
            Q(usergame__user=user)
            & ~Q(
                usergame__user=user,
                usergame__status__in=[UserGame.STATUS_NOT_PLAYED, UserGame.STATUS_STOPPED],
            )
        )
        movies = movies.filter(Q(usermovie__user=user)).exclude(
            usermovie__user=user,
            usermovie__status__in=[UserMovie.STATUS_NOT_WATCHED, UserMovie.STATUS_STOPPED],
        ).distinct()
        shows = shows.filter(Q(usershow__user=user)).exclude(
            usershow__user=user,
            usershow__status__in=[UserShow.STATUS_NOT_WATCHED, UserShow.STATUS_STOPPED],
        )

    for game in _order_game_calendar_releases(games):
        _get_calendar_date(calendar, game.release_date)['games'].append(GameSerializer(game).data)
    for movie in movies:
        _add_movie_calendar_releases(calendar, movie, today)
    episodes = Episode.objects.select_related('tmdb_season', 'tmdb_season__tmdb_show').filter(
        tmdb_season__tmdb_show__in=shows,
        tmdb_release_date__gte=today,
    )
    for episode in episodes:
        _get_calendar_date(calendar, episode.tmdb_release_date)['episodes'].append(
            EpisodeShowSerializer(episode, context={'request': request}).data
        )
    return dict(sorted(calendar.items()))


def get_random_entries(request, categories, count_value, ended_only=False, all_from_db=False):
    try:
        count = int(count_value)
    except (TypeError, ValueError) as error:
        raise InvalidRandomCountError from error
    if count < 1 or count > 100:
        raise InvalidRandomCountError

    today = datetime.today().date()
    games = _get_random_games(request.user, today, all_from_db) if 'games' in categories else None
    movies = _get_random_movies(request.user, today, all_from_db) if 'movies' in categories else None
    shows = _get_random_shows(request.user, today, ended_only, all_from_db) \
        if 'shows' in categories else None
    games_count_available = len(games) if games is not None else 0
    movies_count_available = len(movies) if movies is not None else 0
    shows_count_available = len(shows) if shows is not None else 0
    total = games_count_available + movies_count_available + shows_count_available
    choices = random.choices(
        ['game', 'movie', 'show'],
        weights=(
            games_count_available / total if total else 0,
            movies_count_available / total if total else 0,
            shows_count_available / total if total else 0,
        ),
        k=count,
    )

    result = []
    if games_count_available:
        selected = games.order_by('?')[:min(choices.count('game'), games_count_available)]
        if not all_from_db:
            selected = [item.game for item in selected.select_related('game')]
        result += TypedGameSerializer(selected, many=True).data
    if movies_count_available:
        selected = movies.order_by('?')[:min(choices.count('movie'), movies_count_available)]
        if not all_from_db:
            selected = [item.movie for item in selected.select_related('movie')]
        result += TypedMovieSerializer(selected, many=True, context={'request': request}).data
    if shows_count_available:
        selected = shows.order_by('?')[:min(choices.count('show'), shows_count_available)]
        if not all_from_db:
            selected = [item.show for item in selected.select_related('show')]
        result += TypedShowSerializer(selected, many=True, context={'request': request}).data
    random.shuffle(result)
    return result


def search_users(query):
    users = User.objects.annotate(similarity=TrigramSimilarity('username', query)) \
        .filter(similarity__gt=0.1).order_by('-similarity')
    return UserSerializer(users, many=True).data


def _get_user_shows(user):
    return UserShow.objects.select_related('show') \
        .exclude(status=UserShow.STATUS_NOT_WATCHED) \
        .filter(user=user).order_by('-updated_at') \
        .annotate(watched_episodes_count=Coalesce(
            Count(
                'show__season__episode__userepisode__id',
                filter=Q(show__season__episode__userepisode__user=user)
                & ~Q(show__season__episode__userepisode__score=-1)
                & ~Q(show__season__tmdb_season_number=0),
                distinct=True,
            ),
            0,
        )).annotate(watched_episodes_time=Coalesce(
            Sum(
                Case(
                    When(show__season__episode__tmdb_runtime=0, then='show__tmdb_episode_runtime'),
                    default='show__season__episode__tmdb_runtime',
                ),
                filter=Q(show__season__episode__userepisode__user=user)
                & ~Q(show__season__episode__userepisode__score=-1),
            ),
            0,
        )).annotate(spent_time=ExpressionWrapper(
            Round(1.0 * F('watched_episodes_time') / MINUTES_IN_HOUR),
            output_field=DecimalField(),
        ))


def _get_tracked_people(request, profile_user, viewer_movies, viewer_shows):
    tracked_people = list(UserPerson.objects.select_related('person').filter(user=profile_user))
    if not tracked_people:
        return []

    person_ids = [item.person_id for item in tracked_people]
    marked_movies = {
        item.movie_id: {
            'type': TYPE_MOVIE,
            'id': item.movie.tmdb_id,
            'name': item.movie.tmdb_name or item.movie.tmdb_original_name or 'Без названия',
            'year': item.movie.tmdb_release_date.year if item.movie.tmdb_release_date else None,
            '_updated_at': item.updated_at,
        }
        for item in viewer_movies
    }
    marked_shows = {
        item.show_id: {
            'type': TYPE_SHOW,
            'id': item.show.tmdb_id,
            'name': item.show.tmdb_name or item.show.tmdb_original_name or 'Без названия',
            'year': item.show.tmdb_release_date.year if item.show.tmdb_release_date else None,
            '_updated_at': item.updated_at,
        }
        for item in viewer_shows
    }
    project_keys = collections.defaultdict(set)
    for person_id, movie_id in MoviePerson.objects.filter(
            person_id__in=person_ids, movie_id__in=marked_movies).values_list('person_id', 'movie_id'):
        project_keys[person_id].add((TYPE_MOVIE, movie_id))
    show_pairs = chain(
        ShowPerson.objects.filter(
            person_id__in=person_ids, show_id__in=marked_shows,
        ).values_list('person_id', 'show_id'),
        SeasonPerson.objects.filter(
            person_id__in=person_ids, season__tmdb_show_id__in=marked_shows,
        ).values_list('person_id', 'season__tmdb_show_id'),
        EpisodePerson.objects.filter(
            person_id__in=person_ids,
            episode__tmdb_season__tmdb_show_id__in=marked_shows,
        ).values_list('person_id', 'episode__tmdb_season__tmdb_show_id'),
    )
    for person_id, show_id in show_pairs:
        project_keys[person_id].add((TYPE_SHOW, show_id))

    projects_by_key = {
        **{(TYPE_MOVIE, key): value for key, value in marked_movies.items()},
        **{(TYPE_SHOW, key): value for key, value in marked_shows.items()},
    }
    result = []
    for user_person in tracked_people:
        person = user_person.person
        projects = sorted(
            (projects_by_key[key] for key in project_keys[person.id]),
            key=lambda project: project['_updated_at'],
            reverse=True,
        )
        result.append({
            'id': person.id,
            'tmdb_id': person.tmdb_id,
            'name': person.name,
            'profile_path': get_proxy_url(request, person.tmdb_profile_path),
            'life_years': _format_person_life_years(person),
            'projects': [
                {key: value for key, value in project.items() if key != '_updated_at'}
                for project in projects
            ],
        })
    return result


def _get_calendar_date(calendar, release_date):
    key = str(release_date)
    if not calendar[key]:
        calendar[key] = collections.defaultdict(list)
    return calendar[key]


def _add_movie_calendar_releases(calendar, movie, today):
    data = dict(MovieSerializer(movie).data)
    if movie.tmdb_release_date and movie.tmdb_release_date >= today:
        _get_calendar_date(calendar, movie.tmdb_release_date)['movies'].append({
            **data,
            'calendar_release_type': 'theatrical',
        })
    if movie.tmdb_digital_release_date and movie.tmdb_digital_release_date >= today \
            and movie.tmdb_digital_release_date != movie.tmdb_release_date:
        _get_calendar_date(calendar, movie.tmdb_digital_release_date)['movies'].append({
            **data,
            'calendar_release_type': 'digital',
        })


def _order_game_calendar_releases(games):
    return games.annotate(calendar_release_precision=Case(
        When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_EXACT, then=0),
        When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_MONTH, then=1),
        When(igdb_release_date_format__in=[
            Game.IGDB_RELEASE_DATE_FORMAT_Q1,
            Game.IGDB_RELEASE_DATE_FORMAT_Q2,
            Game.IGDB_RELEASE_DATE_FORMAT_Q3,
            Game.IGDB_RELEASE_DATE_FORMAT_Q4,
        ], then=2),
        When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_YEAR, then=3),
        When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_TBD, then=4),
        default=5,
        output_field=IntegerField(),
    )).order_by('release_date', 'calendar_release_precision', 'igdb_name', 'id')


def _get_random_games(user, today, all_from_db):
    if all_from_db:
        return Game.objects.annotate(release_date=F('igdb_release_date')) \
            .filter(release_date__lte=today).exclude(
                usergame__user=user,
                usergame__status__in=[
                    UserGame.STATUS_PLAYING,
                    UserGame.STATUS_COMPLETED,
                    UserGame.STATUS_STOPPED,
                ],
            ).distinct()
    return UserGame.objects.annotate(game_release_date=F('game__igdb_release_date')).filter(
        user=user,
        status=UserGame.STATUS_GOING,
        game_release_date__lte=today,
    )


def _get_random_movies(user, today, all_from_db):
    if all_from_db:
        return Movie.objects.filter(tmdb_release_date__lte=today).exclude(
            usermovie__user=user,
            usermovie__status__in=[UserMovie.STATUS_WATCHED, UserMovie.STATUS_STOPPED],
        ).distinct()
    return UserMovie.objects.filter(
        user=user,
        status=UserMovie.STATUS_GOING,
        movie__tmdb_release_date__lte=today,
    )


def _get_random_shows(user, today, ended_only, all_from_db):
    if all_from_db:
        filters = {'tmdb_release_date__lte': today}
        if ended_only:
            filters['tmdb_status__in'] = [Show.TMDB_STATUS_ENDED, Show.TMDB_STATUS_CANCELED]
        return Show.objects.filter(**filters).exclude(
            usershow__user=user,
            usershow__status__in=[
                UserShow.STATUS_WATCHED,
                UserShow.STATUS_STOPPED,
                UserShow.STATUS_WATCHING,
            ],
        ).distinct()
    filters = {
        'user': user,
        'status': UserShow.STATUS_GOING,
        'show__tmdb_release_date__lte': today,
    }
    if ended_only:
        filters['show__tmdb_status__in'] = [Show.TMDB_STATUS_ENDED, Show.TMDB_STATUS_CANCELED]
    return UserShow.objects.filter(**filters)


def _format_person_life_years(person):
    birth_year = person.tmdb_birthday.year if person.tmdb_birthday else None
    death_year = person.tmdb_deathday.year if person.tmdb_deathday else None
    if birth_year:
        return f'{birth_year}–{death_year or "н.в."}'
    return str(death_year) if death_year else ''
