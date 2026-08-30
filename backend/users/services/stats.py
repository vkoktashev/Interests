import collections
import math
from datetime import datetime, timedelta
from itertools import chain
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db.models import (
    Case,
    Count,
    ExpressionWrapper,
    F,
    FloatField,
    QuerySet,
    Sum,
    Value,
    When,
)
from django.db.models.functions import ExtractYear
from django.utils import timezone

from games.models import GameBeatTime, GameDeveloper, GameLog, UserGame
from movies.models import MovieLog, MoviePerson, UserMovie
from people.models import PersonLog
from shows.models import Episode, EpisodeLog, SeasonLog, ShowLog, ShowPerson, UserEpisode, UserShow
from users.models import User, UserLog
from utils.constants import MINUTES_IN_HOUR


class InvalidPersonalityTypeError(Exception):
    pass


def resolve_user_timezone(tz_name: Optional[str]):
    if not tz_name:
        return timezone.get_current_timezone()
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        return timezone.get_current_timezone()


def get_user_stats(user, timezone_name=None):
    stats = {}
    user_games = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).filter(user=user)
    stats.update(calculate_games_stats(user_games, user))
    stats.update(calculate_movies_stats(user))
    stats.update(calculate_shows_stats(user))
    stats.update(calculate_top_personality_points(user))
    stats.update(calculate_status_funnel(user))
    stats.update(calculate_scores_stats(user))
    stats.update(calculate_backlog_metrics(user))
    stats.update(calculate_time_distribution_last_year(user))
    stats.update(calculate_activity_stats(user, resolve_user_timezone(timezone_name)))
    return stats


def get_top_personalities(user, personality_type):
    calculators = {
        'actors': calculate_top_actor_points,
        'directors': calculate_top_director_points,
        'studios': calculate_top_developer_points,
    }
    calculator = calculators.get(personality_type)
    if calculator is None:
        raise InvalidPersonalityTypeError
    return calculator(user)


def calculate_games_stats(user_games: QuerySet, user: User) -> dict:
    if user_games.exists():
        games_total_spent_time = user_games.aggregate(total_spent_time=Sum('spent_time'))['total_spent_time']

        games_genres_spent_time = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .filter(user=user) \
            .values(name=F('game__gamegenre__genre__igdb_name')) \
            .annotate(spent_time_percent=Sum('spent_time'))

        if games_total_spent_time > 0:
            for genre in games_genres_spent_time:
                genre['spent_time_percent'] = round(genre['spent_time_percent'] * 100 / games_total_spent_time, 1)

        completed_games_by_years = user_games.exclude(status=UserGame.STATUS_GOING) \
            .annotate(year=ExtractYear(F('game__igdb_release_date'))).values('year') \
            .annotate(count=Count('id')).exclude(year=None).order_by()
    else:
        games_total_spent_time = 0
        games_genres_spent_time = []
        completed_games_by_years = []

    result = {'games': {
        'count': user_games.count(),
        'total_spent_time': games_total_spent_time,
        'genres': games_genres_spent_time,
        'years': completed_games_by_years
    }}

    return result


def calculate_movies_stats(user: User) -> dict:
    watched_movies = UserMovie.objects.filter(user=user, status=UserMovie.STATUS_WATCHED)
    if watched_movies.exists():
        movies_total_spent_time = watched_movies.aggregate(total_time_spent=Sum('movie__tmdb_runtime')) \
            .get('total_time_spent')

        movies_genres_spent_time = watched_movies.values(name=F('movie__moviegenre__genre__tmdb_name')) \
            .annotate(spent_time_percent=Sum('movie__tmdb_runtime'))

        for genre in movies_genres_spent_time:
            genre['spent_time_percent'] = round(genre['spent_time_percent'] * 100 /
                                                movies_total_spent_time, 1)

        movies_total_spent_time = round(movies_total_spent_time / MINUTES_IN_HOUR, 1)

        watched_movies_by_year = watched_movies.annotate(year=ExtractYear('movie__tmdb_release_date')) \
            .values('year').annotate(count=Count('id')).exclude(year=None).order_by()

    else:
        movies_total_spent_time = 0
        movies_genres_spent_time = []
        watched_movies_by_year = []

    result = {'movies': {
        'count': watched_movies.count(),
        'total_spent_time': movies_total_spent_time,
        'genres': movies_genres_spent_time,
        'years': watched_movies_by_year
    }}
    return result


def calculate_shows_stats(user: User) -> dict:
    watched_episodes = UserEpisode.objects.exclude(score=-1).filter(user=user)
    if watched_episodes.exists():
        shows_total_spent_time = watched_episodes.aggregate(
            total_spent_time=Sum(
                Case(When(episode__tmdb_runtime=0, then='episode__tmdb_season__tmdb_show__tmdb_episode_runtime'),
                     default='episode__tmdb_runtime')))['total_spent_time']

        shows_genres_spent_time = watched_episodes \
            .values(name=F('episode__tmdb_season__tmdb_show__showgenre__genre__tmdb_name')) \
            .annotate(spent_time_percent=Sum(
            Case(When(episode__tmdb_runtime=0, then='episode__tmdb_season__tmdb_show__tmdb_episode_runtime'),
                 default='episode__tmdb_runtime')))

        for genre in shows_genres_spent_time:
            genre['spent_time_percent'] = round(genre['spent_time_percent'] * 100 /
                                                shows_total_spent_time, 1) if shows_total_spent_time != 0 else 0

        shows_total_spent_time = round(shows_total_spent_time / MINUTES_IN_HOUR, 1)

        watched_shows_by_years = UserShow.objects.filter(user=user) \
            .exclude(status__in=[UserShow.STATUS_NOT_WATCHED, UserShow.STATUS_GOING]) \
            .annotate(year=ExtractYear('show__tmdb_release_date')) \
            .values('year').annotate(count=Count('id')).exclude(year=None).order_by()

        watched_seasons_by_years = watched_episodes \
            .exclude(episode__tmdb_season__tmdb_season_number=0) \
            .annotate(year=ExtractYear('episode__tmdb_season__tmdb_air_date')) \
            .values('year') \
            .annotate(count=Count('episode__tmdb_season', distinct=True)) \
            .exclude(year=None).order_by()
    else:
        shows_total_spent_time = 0
        shows_genres_spent_time = []
        watched_shows_by_years = []
        watched_seasons_by_years = []

    result = {'episodes': {
        'count': watched_episodes.count(),
        'total_spent_time': shows_total_spent_time,
        'genres': shows_genres_spent_time,
        'years': watched_shows_by_years,
        'season_years': watched_seasons_by_years
    }}
    return result


def calculate_top_actor_points(user: User, limit: Optional[int] = None) -> list:
    actors_points = {}

    watched_episode_counts = {
        item['episode__tmdb_season__tmdb_show_id']: item['count']
        for item in UserEpisode.objects
        .filter(
            user=user,
            score__gt=-1,
            episode__tmdb_season__tmdb_season_number__gt=0,
        )
        .values('episode__tmdb_season__tmdb_show_id')
        .annotate(count=Count('id'))
    }

    movie_actor_weight = Case(
        When(sort_order__lte=2, then=Value(1.0)),
        When(sort_order__lte=5, then=Value(0.9)),
        When(sort_order__lte=9, then=Value(0.8)),
        When(sort_order__lte=14, then=Value(0.65)),
        When(sort_order__lte=19, then=Value(0.5)),
        When(sort_order__lte=29, then=Value(0.25)),
        default=Value(0.0),
        output_field=FloatField(),
    )
    weighted_movie_score = ExpressionWrapper(
        F('movie__usermovie__score') * movie_actor_weight,
        output_field=FloatField(),
    )

    movies_actors = MoviePerson.objects \
        .filter(movie__usermovie__user=user,
                movie__usermovie__status__in=[UserMovie.STATUS_WATCHED, UserMovie.STATUS_STOPPED],
                movie__usermovie__score__gt=0,
                role=MoviePerson.ROLE_ACTOR,
                sort_order__lt=30) \
        .exclude(character__icontains='uncredited') \
        .values('person__id', 'person__tmdb_id', 'person__name') \
        .annotate(points=Sum(weighted_movie_score))

    shows_actors = ShowPerson.objects \
        .filter(show__usershow__user=user,
                show__usershow__score__gt=0,
                role=ShowPerson.ROLE_ACTOR,
                sort_order__lt=50,
                show__usershow__status__in=[
                    UserShow.STATUS_WATCHING,
                    UserShow.STATUS_WATCHED,
                    UserShow.STATUS_STOPPED,
                ]) \
        .exclude(character__icontains='uncredited') \
        .values(
            'person__id',
            'person__tmdb_id',
            'person__name',
            'show_id',
            'show__usershow__score',
            'show__usershow__status',
            'show__tmdb_number_of_episodes',
            'episode_count',
            'sort_order',
        )

    for item in movies_actors:
        person_tmdb_id = item.get('person__tmdb_id')
        person_id = item.get('person__id')
        name = item.get('person__name')
        points = float(item.get('points') or 0)
        if person_tmdb_id is None or person_id is None or not name:
            continue

        actors_points[person_tmdb_id] = {'id': person_id, 'name': name, 'points': points}

    for item in shows_actors:
        person_tmdb_id = item.get('person__tmdb_id')
        person_id = item.get('person__id')
        name = item.get('person__name')
        if person_tmdb_id is None or person_id is None or not name:
            continue

        score = float(item.get('show__usershow__score') or 0)
        show_id = item.get('show_id')
        show_status = item.get('show__usershow__status')
        episode_count = int(item.get('episode_count') or 0)
        total_episode_count = int(item.get('show__tmdb_number_of_episodes') or 0)
        sort_order = int(item.get('sort_order') or 0)

        if sort_order <= 4:
            cast_weight = 1.0
        elif sort_order <= 9:
            cast_weight = 0.9
        elif sort_order <= 19:
            cast_weight = 0.75
        elif sort_order <= 29:
            cast_weight = 0.6
        elif sort_order <= 39:
            cast_weight = 0.4
        else:
            cast_weight = 0.25

        coverage = 1.0
        if episode_count > 0 and total_episode_count > 0:
            coverage = math.sqrt(min(1.0, episode_count / total_episode_count))

        if show_status == UserShow.STATUS_WATCHED:
            watch_progress = 1.0
        elif total_episode_count > 0:
            watched_episode_count = watched_episode_counts.get(show_id, 0)
            watch_progress = min(1.0, watched_episode_count / total_episode_count)
        else:
            watch_progress = 1.0

        watched_actor_episode_count = episode_count * watch_progress
        volume_bonus = 1.0
        if watched_actor_episode_count > 3:
            volume_bonus += 4 * (
                math.sqrt(watched_actor_episode_count) - math.sqrt(3)
            ) / (math.sqrt(200) - math.sqrt(3))
            volume_bonus = min(5.0, volume_bonus)

        points = score * cast_weight * coverage * math.sqrt(watch_progress) * volume_bonus

        current = actors_points.get(person_tmdb_id)
        if current is None:
            actors_points[person_tmdb_id] = {'id': person_id, 'name': name, 'points': points}
        else:
            current['points'] += points

    top_actors_by_points = sorted(
        actors_points.values(),
        key=lambda entry: (-entry['points'], entry['name']),
    )
    if limit is not None:
        top_actors_by_points = top_actors_by_points[:limit]

    return [
        {'id': item['id'], 'name': item['name'], 'points': round(item['points'], 1)}
        for item in top_actors_by_points
    ]


def calculate_top_director_points(user: User, limit: Optional[int] = None) -> list:
    directors_points = {}

    watched_episode_counts = {
        item['episode__tmdb_season__tmdb_show_id']: item['count']
        for item in UserEpisode.objects
        .filter(
            user=user,
            score__gt=-1,
            episode__tmdb_season__tmdb_season_number__gt=0,
        )
        .values('episode__tmdb_season__tmdb_show_id')
        .annotate(count=Count('id'))
    }

    movies_directors = MoviePerson.objects \
        .filter(movie__usermovie__user=user,
                movie__usermovie__status__in=[UserMovie.STATUS_WATCHED, UserMovie.STATUS_STOPPED],
                movie__usermovie__score__gt=0,
                role=MoviePerson.ROLE_DIRECTOR) \
        .values('person__id', 'person__tmdb_id', 'person__name') \
        .annotate(points=Sum('movie__usermovie__score'))

    shows_directors = ShowPerson.objects \
        .filter(show__usershow__user=user,
                show__usershow__score__gt=0,
                role=ShowPerson.ROLE_DIRECTOR,
                show__usershow__status__in=[
                    UserShow.STATUS_WATCHING,
                    UserShow.STATUS_WATCHED,
                    UserShow.STATUS_STOPPED,
                ]) \
        .values(
            'person__id',
            'person__tmdb_id',
            'person__name',
            'show_id',
            'show__usershow__score',
            'show__usershow__status',
            'show__tmdb_number_of_episodes',
            'episode_count',
        )

    for item in movies_directors:
        person_tmdb_id = item.get('person__tmdb_id')
        person_id = item.get('person__id')
        name = item.get('person__name')
        points = float(item.get('points') or 0)
        if person_tmdb_id is None or person_id is None or not name:
            continue

        directors_points[person_tmdb_id] = {'id': person_id, 'name': name, 'points': points}

    shows_directors = list(shows_directors)
    show_director_episode_totals = collections.defaultdict(int)
    show_director_counts = collections.defaultdict(int)
    for item in shows_directors:
        show_id = item.get('show_id')
        show_director_episode_totals[show_id] += int(item.get('episode_count') or 0)
        show_director_counts[show_id] += 1

    for item in shows_directors:
        person_tmdb_id = item.get('person__tmdb_id')
        person_id = item.get('person__id')
        name = item.get('person__name')
        if person_tmdb_id is None or person_id is None or not name:
            continue

        show_id = item.get('show_id')
        score = float(item.get('show__usershow__score') or 0)
        show_status = item.get('show__usershow__status')
        total_episode_count = int(item.get('show__tmdb_number_of_episodes') or 0)
        director_episode_count = int(item.get('episode_count') or 0)
        total_director_episode_count = show_director_episode_totals[show_id]

        if show_status == UserShow.STATUS_WATCHED:
            watch_progress = 1.0
        elif total_episode_count > 0:
            watched_episode_count = watched_episode_counts.get(show_id, 0)
            watch_progress = min(1.0, watched_episode_count / total_episode_count)
        else:
            watch_progress = 1.0

        show_length_factor = 1.0
        if total_episode_count > 0:
            show_length_factor = min(3.0, max(1.0, math.sqrt(total_episode_count / 8)))

        if total_director_episode_count > 0:
            director_share = director_episode_count / total_director_episode_count
        else:
            director_share = 1 / show_director_counts[show_id]

        points = score * show_length_factor * math.sqrt(watch_progress) * director_share
        current = directors_points.get(person_tmdb_id)
        if current is None:
            directors_points[person_tmdb_id] = {'id': person_id, 'name': name, 'points': points}
        else:
            current['points'] += points

    top_directors = [
        {'id': item['id'], 'name': item['name'], 'points': round(item['points'], 1)}
        for item in directors_points.values()
    ]
    top_directors.sort(key=lambda entry: (-entry['points'], entry['name']))
    if limit is not None:
        top_directors = top_directors[:limit]

    return top_directors


def calculate_top_developer_points(user: User, limit: Optional[int] = None) -> list:
    developers_points = collections.defaultdict(int)

    games_developers = GameDeveloper.objects \
        .filter(game__usergame__user=user,
                developer__is_publisher=False,
                game__usergame__score__gt=0,
                game__usergame__status__in=[
                    UserGame.STATUS_PLAYING,
                    UserGame.STATUS_COMPLETED,
                    UserGame.STATUS_STOPPED,
                ]) \
        .values('developer__igdb_id', 'developer__name') \
        .annotate(points=Sum('game__usergame__score'))

    for item in games_developers:
        name = item.get('developer__name')
        points = int(item.get('points') or 0)
        if not name:
            continue
        developers_points[name] += points

    top_developers = [{'name': name, 'points': points} for name, points in developers_points.items()]
    top_developers.sort(key=lambda entry: (-entry['points'], entry['name']))
    if limit is not None:
        top_developers = top_developers[:limit]

    return top_developers


def calculate_top_personality_points(user: User) -> dict:
    top_actors = calculate_top_actor_points(user, limit=10)
    top_directors = calculate_top_director_points(user, limit=10)
    top_developers = calculate_top_developer_points(user, limit=10)

    return {'top_actors': top_actors, 'top_directors': top_directors, 'top_developers': top_developers}


def calculate_status_funnel(user: User) -> dict:
    games = UserGame.objects.filter(user=user)
    movies = UserMovie.objects.filter(user=user)
    shows = UserShow.objects.filter(user=user)

    return {
        'status_funnel': {
            'games': {
                'planned': games.filter(status=UserGame.STATUS_GOING).count(),
                'in_progress': games.filter(status=UserGame.STATUS_PLAYING).count(),
                'completed': games.filter(status=UserGame.STATUS_COMPLETED).count(),
                'dropped': games.filter(status=UserGame.STATUS_STOPPED).count(),
            },
            'movies': {
                'planned': movies.filter(status=UserMovie.STATUS_GOING).count(),
                'in_progress': 0,
                'completed': movies.filter(status=UserMovie.STATUS_WATCHED).count(),
                'dropped': movies.filter(status=UserMovie.STATUS_STOPPED).count(),
            },
            'shows': {
                'planned': shows.filter(status=UserShow.STATUS_GOING).count(),
                'in_progress': shows.filter(status=UserShow.STATUS_WATCHING).count(),
                'completed': shows.filter(status=UserShow.STATUS_WATCHED).count(),
                'dropped': shows.filter(status=UserShow.STATUS_STOPPED).count(),
            },
        }
    }


def calculate_scores_stats(user: User) -> dict:
    games_scores = list(UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED)
                        .filter(user=user, score__gt=0).values_list('score', flat=True))
    movies_scores = list(UserMovie.objects.exclude(status=UserMovie.STATUS_NOT_WATCHED)
                         .filter(user=user, score__gt=0).values_list('score', flat=True))
    shows_scores = list(UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED)
                        .filter(user=user, score__gt=0).values_list('score', flat=True))

    overall_scores = games_scores + movies_scores + shows_scores

    def to_average(scores):
        if not scores:
            return 0
        return round(sum(scores) / len(scores), 1)

    def to_distribution(scores):
        score_counter = collections.Counter(scores)
        return [{'score': score, 'count': score_counter.get(score, 0)} for score in range(1, 11)]

    return {
        'scores': {
            'overall_average': to_average(overall_scores),
            'games': {
                'average': to_average(games_scores),
                'distribution': to_distribution(games_scores),
            },
            'movies': {
                'average': to_average(movies_scores),
                'distribution': to_distribution(movies_scores),
            },
            'shows': {
                'average': to_average(shows_scores),
                'distribution': to_distribution(shows_scores),
            },
        }
    }


def calculate_backlog_metrics(user: User) -> dict:
    now = timezone.now()
    today = timezone.localdate(now)

    planned_games = UserGame.objects.filter(
        user=user,
        status=UserGame.STATUS_GOING,
        game__igdb_release_date__lte=today,
    )
    planned_movies = UserMovie.objects.filter(
        user=user,
        status=UserMovie.STATUS_GOING,
        movie__tmdb_release_date__lte=today,
    )
    planned_shows = UserShow.objects.filter(
        user=user,
        status=UserShow.STATUS_GOING,
        show__tmdb_release_date__lte=today,
    )
    eligible_shows = UserShow.objects.filter(
        user=user,
        show__tmdb_release_date__lte=today,
    ).exclude(
        status__in=[UserShow.STATUS_NOT_WATCHED, UserShow.STATUS_STOPPED]
    )

    def average_age_days(values):
        age_seconds = []
        for added_at, release_date in values:
            if added_at is None or release_date is None:
                continue

            release_datetime = timezone.make_aware(
                datetime.combine(release_date, datetime.min.time()),
                timezone.get_current_timezone(),
            )
            # min(time since addition, time since release) starts at the later timestamp.
            age_started_at = max(added_at, release_datetime)
            age_seconds.append(max(0, (now - age_started_at).total_seconds()))

        if not age_seconds:
            return 0
        return round(sum(age_seconds) / len(age_seconds) / 86400, 1)

    games_age_values = list(planned_games.values_list('updated_at', 'game__igdb_release_date'))
    movies_age_values = list(planned_movies.values_list('updated_at', 'movie__tmdb_release_date'))
    shows_age_values = list(planned_shows.values_list('updated_at', 'show__tmdb_release_date'))
    all_age_values = games_age_values + movies_age_values + shows_age_values

    movies_minutes = planned_movies.aggregate(total=Sum('movie__tmdb_runtime')).get('total') or 0

    planned_game_ids = list(planned_games.values_list('game_id', flat=True))
    beat_times = GameBeatTime.objects.filter(
        game_id__in=planned_game_ids,
        type__in=[GameBeatTime.TYPE_EXTRA, GameBeatTime.TYPE_MAIN],
        hours__gt=0,
    ).values('game_id', 'source', 'type', 'hours')

    game_hours_by_id = {}
    for row in beat_times:
        gid = row['game_id']
        source = row['source']
        beat_type = row['type']
        hours = float(row['hours'])
        existing = game_hours_by_id.get(gid)
        if existing is None:
            game_hours_by_id[gid] = (hours, source, beat_type)
        else:
            _, ex_source, ex_type = existing
            # Priority: HLTB extra > IGDB extra > HLTB main > IGDB main
            def _rank(s, t):
                return (t == GameBeatTime.TYPE_EXTRA, s == GameBeatTime.SOURCE_HLTB)
            if _rank(source, beat_type) > _rank(ex_source, ex_type):
                game_hours_by_id[gid] = (hours, source, beat_type)

    games_hours = round(sum(h for h, _, _ in game_hours_by_id.values()), 1)

    eligible_show_ids = list(eligible_shows.values_list('show_id', flat=True))

    eligible_episodes = Episode.objects.filter(
        tmdb_season__tmdb_show_id__in=eligible_show_ids,
        tmdb_season__tmdb_season_number__gt=0,
        tmdb_release_date__lte=today,
    )

    watched_episode_ids = set(
        UserEpisode.objects.filter(
            user=user,
            episode__in=eligible_episodes,
        ).values_list('episode_id', flat=True)
    )

    shows_minutes = eligible_episodes.exclude(id__in=watched_episode_ids).aggregate(
        total=Sum(
            Case(
                When(tmdb_runtime=0, then='tmdb_season__tmdb_show__tmdb_episode_runtime'),
                default='tmdb_runtime'
            )
        )
    ).get('total') or 0

    movies_hours = round(movies_minutes / MINUTES_IN_HOUR, 1)
    shows_hours = round(shows_minutes / MINUTES_IN_HOUR, 1)

    counts = {
        'games': planned_games.count(),
        'movies': planned_movies.count(),
        'shows': planned_shows.count(),
    }

    return {
        'backlog': {
            'counts': {
                **counts,
                'total': counts['games'] + counts['movies'] + counts['shows'],
            },
            'average_age_days': {
                'games': average_age_days(games_age_values),
                'movies': average_age_days(movies_age_values),
                'shows': average_age_days(shows_age_values),
                'overall': average_age_days(all_age_values),
            },
            'estimated_hours_to_close': {
                'games': games_hours,
                'movies': movies_hours,
                'shows': shows_hours,
                'total': round(games_hours + movies_hours + shows_hours, 1),
            },
        }
    }


def calculate_time_distribution_last_year(user: User) -> dict:
    cutoff = timezone.now() - timedelta(days=365)

    completed_game_statuses = (
        UserGame.STATUS_COMPLETED,
        dict(UserGame.STATUS_CHOICES)[UserGame.STATUS_COMPLETED],
    )
    completed_game_ids_last_year = GameLog.objects.filter(
        user=user,
        action_type=GameLog.ACTION_TYPE_STATUS,
        action_result__in=completed_game_statuses,
        created__gte=cutoff,
    ).values_list('game_id', flat=True).distinct()
    games_time = UserGame.objects.filter(
        user=user,
        game_id__in=completed_game_ids_last_year,
    ) \
        .aggregate(total_spent_time=Sum('spent_time'))['total_spent_time'] or 0

    watched_movie_statuses = (
        UserMovie.STATUS_WATCHED,
        dict(UserMovie.STATUS_CHOICES)[UserMovie.STATUS_WATCHED],
    )
    watched_movie_ids_last_year = MovieLog.objects.filter(
        user=user,
        action_type=MovieLog.ACTION_TYPE_STATUS,
        action_result__in=watched_movie_statuses,
        created__gte=cutoff,
    ).values_list('movie_id', flat=True).distinct()
    movies_minutes = UserMovie.objects.filter(
        user=user,
        movie_id__in=watched_movie_ids_last_year,
    ) \
        .aggregate(total_time_spent=Sum('movie__tmdb_runtime')) \
        .get('total_time_spent') or 0

    watched_episode_ids_last_year = EpisodeLog.objects \
        .filter(user=user, action_type=EpisodeLog.ACTION_TYPE_SCORE, created__gte=cutoff) \
        .exclude(action_result='-1') \
        .values_list('episode_id', flat=True) \
        .distinct()

    episodes_minutes = UserEpisode.objects.exclude(score=-1) \
        .filter(user=user, episode_id__in=watched_episode_ids_last_year) \
        .aggregate(total_spent_time=Sum(
        Case(When(episode__tmdb_runtime=0, then='episode__tmdb_season__tmdb_show__tmdb_episode_runtime'),
             default='episode__tmdb_runtime')))['total_spent_time'] or 0

    bulk_episodes_minutes = 0
    bulk_episode_logs = ShowLog.objects.filter(
        user=user,
        action_type=ShowLog.ACTION_TYPE_EPISODES,
        created__gte=cutoff,
    ).values_list('action_result', 'show__tmdb_episode_runtime')
    for episodes_count_value, episode_runtime in bulk_episode_logs:
        try:
            episodes_count = int(episodes_count_value)
        except (TypeError, ValueError):
            continue
        if episodes_count > 0:
            bulk_episodes_minutes += episodes_count * max(episode_runtime or 0, 0)

    episodes_minutes += bulk_episodes_minutes

    return {
        'time_distribution_last_year': {
            'games': float(games_time),
            'movies': round(movies_minutes / MINUTES_IN_HOUR, 1),
            'episodes': round(episodes_minutes / MINUTES_IN_HOUR, 1),
        }
    }


def calculate_activity_stats(user: User, user_timezone=None) -> dict:
    effective_timezone = user_timezone or timezone.get_current_timezone()
    today = timezone.localdate(timezone=effective_timezone)
    period_start = today - timedelta(days=364)
    period_end_exclusive = today + timedelta(days=1)
    period_start_dt = timezone.make_aware(
        datetime.combine(period_start, datetime.min.time()),
        timezone=effective_timezone,
    )
    period_end_dt = timezone.make_aware(
        datetime.combine(period_end_exclusive, datetime.min.time()),
        timezone=effective_timezone,
    )
    events_by_date = collections.Counter()

    log_datetimes = chain(
        GameLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
        MovieLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
        ShowLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
        SeasonLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
        EpisodeLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
        UserLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
        PersonLog.objects.filter(
            user=user, created__gte=period_start_dt, created__lt=period_end_dt,
        ).values_list('created', flat=True),
    )

    for dt in log_datetimes:
        if dt is None:
            continue
        local_dt = timezone.localtime(dt, timezone=effective_timezone)
        events_by_date[local_dt.date()] += 1

    active_dates = set(events_by_date)
    sorted_dates = sorted(active_dates)
    longest_streak = 0
    previous_date = None
    current_chain = 0
    for current_date in sorted_dates:
        if previous_date is not None and (current_date - previous_date).days == 1:
            current_chain += 1
        else:
            current_chain = 1
        longest_streak = max(longest_streak, current_chain)
        previous_date = current_date

    current_streak = 0
    day_cursor = today
    while day_cursor in active_dates:
        current_streak += 1
        day_cursor -= timedelta(days=1)

    days = []
    day_cursor = period_start
    while day_cursor <= today:
        days.append({
            'date': day_cursor.isoformat(),
            'count': events_by_date.get(day_cursor, 0),
        })
        day_cursor += timedelta(days=1)

    return {
        'activity': {
            'days': days,
            'period': {
                'start': period_start.isoformat(),
                'end': today.isoformat(),
            },
            'total_events': sum(events_by_date.values()),
            'active_days': len(active_dates),
            'streak': {
                'current': current_streak,
                'longest': longest_streak,
            },
        }
    }


