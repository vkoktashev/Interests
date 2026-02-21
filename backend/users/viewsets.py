import collections
import random
from datetime import datetime, timedelta
from itertools import chain
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.paginator import Paginator
from django.db.models import Sum, F, Count, Q, ExpressionWrapper, DecimalField, QuerySet, Case, When
from django.db.models.functions import ExtractYear, Coalesce
from django.utils import timezone
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenRefreshView

from games.models import UserGame, GameLog, Game
from games.serializers import GameStatsSerializer, GameLogSerializer, GameSerializer, TypedGameSerializer
from movies.models import UserMovie, MovieLog, Movie, MoviePerson
from movies.serializers import MovieLogSerializer, MovieStatsSerializer, MovieSerializer, TypedMovieSerializer
from shows.models import UserShow, UserEpisode, ShowLog, EpisodeLog, SeasonLog, Show, Episode, ShowPerson
from shows.serializers import ShowStatsSerializer, ShowLogSerializer, SeasonLogSerializer, EpisodeLogSerializer, \
    EpisodeShowSerializer, TypedShowSerializer
from users.serializers import UserFollowSerializer, UserLogSerializer, \
    UserInfoSerializer, SettingsSerializer, UserSerializer, MyTokenRefreshSerializer
from utils.constants import ERROR, ID_VALUE_ERROR, \
    USER_NOT_FOUND, MINUTES_IN_HOUR, TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, \
    TYPE_SEASON, TYPE_EPISODE, TYPE_USER, CANNOT_DELETE_ANOTHER_USER_LOG, WRONG_LOG_TYPE, LOG_NOT_FOUND
from utils.functions import get_page_size
from utils.models import Round
from .functions import is_user_available
from .models import User, UserFollow, UserLog


def resolve_user_timezone(tz_name: Optional[str]):
    if not tz_name:
        return timezone.get_current_timezone()

    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        return timezone.get_current_timezone()


class MyTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = MyTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        data = request.data.copy()

        if 'refreshToken' in data:
            refresh_token = data.pop('refreshToken')
            if isinstance(refresh_token, list):
                refresh_token = refresh_token[0]
            data['refresh'] = refresh_token
        request._full_data = data
        return super().post(request, *args, **kwargs)


class UserViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    serializer_class = UserSerializer
    queryset = User.objects.all()

    @action(detail=True, methods=['get', 'delete'])
    def log(self, request, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'), request.user)
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            if not is_user_available(request.user, user):
                return Response(status=status.HTTP_403_FORBIDDEN)

            results, count = get_logs((user,), request.GET.get('page_size'), request.GET.get('page'),
                                      request.GET.get('query', ''),
                                      request.query_params.getlist('filters[]',
                                                                   (TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, TYPE_USER)))

            return Response({'log': results, 'count': count})

        else:
            if request.user != user:
                return Response({ERROR: CANNOT_DELETE_ANOTHER_USER_LOG}, status=status.HTTP_403_FORBIDDEN)

            log_id = request.data.get('id')
            log_type = request.data.get('type')

            if log_type == TYPE_GAME:
                Model = GameLog
            elif log_type == TYPE_MOVIE:
                Model = MovieLog
            elif log_type == TYPE_SHOW:
                Model = ShowLog
            elif log_type == TYPE_SEASON:
                Model = SeasonLog
            elif log_type == TYPE_EPISODE:
                Model = EpisodeLog
            elif log_type == TYPE_USER:
                Model = UserLog
            else:
                return Response({ERROR: WRONG_LOG_TYPE}, status=status.HTTP_400_BAD_REQUEST)

            try:
                Model.objects.get(id=log_id, user=user).delete()
            except ValueError:
                return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
            except Model.DoesNotExist:
                return Response({ERROR: LOG_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_log(self, request):
        user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
        results, count = get_logs(user_follow_query, request.GET.get('page_size'), request.GET.get('page'),
                                  request.GET.get('query', ''),
                                  request.query_params.getlist('filters[]',
                                                               (TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, TYPE_USER)))

        return Response({'log': results, 'count': count})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def release_calendar(self, request):
        today_date = datetime.today().date()
        calendar_dict = collections.defaultdict(dict)

        # games
        games = Game.objects \
            .filter(Q(usergame__user=request.user, rawg_release_date__gte=today_date) &
                    ~Q(usergame__user=request.user, usergame__status__in=[UserGame.STATUS_NOT_PLAYED,
                                                                          UserGame.STATUS_STOPPED]))
        for game in games:
            rawg_release_date_str = str(game.rawg_release_date)
            release_date = calendar_dict[rawg_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[rawg_release_date_str] = release_date

            release_date['games'].append(GameSerializer(game).data)

        # movies
        movies = Movie.objects \
            .filter(Q(usermovie__user=request.user, tmdb_release_date__gte=today_date) &
                    ~Q(usermovie__user=request.user, usermovie__status__in=[UserMovie.STATUS_NOT_WATCHED,
                                                                            UserMovie.STATUS_STOPPED]))

        for movie in movies:
            tmdb_release_date_str = str(movie.tmdb_release_date)
            release_date = calendar_dict[tmdb_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[tmdb_release_date_str] = release_date

            release_date['movies'].append(MovieSerializer(movie).data)

        # episodes
        shows = Show.objects \
            .filter(Q(usershow__user=request.user) &
                    ~Q(usershow__user=request.user,
                       usershow__status__in=[UserShow.STATUS_NOT_WATCHED, UserShow.STATUS_STOPPED]))

        episodes = Episode.objects.select_related('tmdb_season', 'tmdb_season__tmdb_show') \
            .filter(tmdb_season__tmdb_show__in=shows, tmdb_release_date__gte=today_date)

        for episode in episodes:
            tmdb_release_date_str = str(episode.tmdb_release_date)
            release_date = calendar_dict[tmdb_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[tmdb_release_date_str] = release_date

            release_date['episodes'].append(EpisodeShowSerializer(episode, context={'request': request}).data)

        calendar_dict = dict(sorted(calendar_dict.items()))

        return Response(calendar_dict, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def full_release_calendar(self, request):
        today_date = datetime.today().date()
        calendar_dict = collections.defaultdict(dict)

        # games
        games = Game.objects.filter(rawg_release_date__gte=today_date)
        for game in games:
            rawg_release_date_str = str(game.rawg_release_date)
            release_date = calendar_dict[rawg_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[rawg_release_date_str] = release_date

            release_date['games'].append(GameSerializer(game).data)

        # movies
        movies = Movie.objects.filter(tmdb_release_date__gte=today_date)

        for movie in movies:
            tmdb_release_date_str = str(movie.tmdb_release_date)
            release_date = calendar_dict[tmdb_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[tmdb_release_date_str] = release_date

            release_date['movies'].append(MovieSerializer(movie).data)

        # episodes
        shows = Show.objects.all()
        episodes = Episode.objects.select_related('tmdb_season', 'tmdb_season__tmdb_show') \
            .filter(tmdb_season__tmdb_show__in=shows, tmdb_release_date__gte=today_date)

        for episode in episodes:
            tmdb_release_date_str = str(episode.tmdb_release_date)
            release_date = calendar_dict[tmdb_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[tmdb_release_date_str] = release_date

            release_date['episodes'].append(EpisodeShowSerializer(episode, context={'request': request}).data)

        calendar_dict = dict(sorted(calendar_dict.items()))

        return Response(calendar_dict, status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'), request.user)
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        try:
            user_is_followed = UserFollow.objects.get(user=request.user, followed_user=user).is_following
        except (UserFollow.DoesNotExist, TypeError):
            user_is_followed = False

        is_available = is_user_available(request.user, user)

        if not is_available:
            return Response({'username': user.username, 'is_available': is_available})

        user_games = UserGame.objects.select_related('game') \
            .exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = GameStatsSerializer(user_games, many=True)
        games = serializer.data

        user_movies = UserMovie.objects.select_related('movie') \
            .exclude(status=UserMovie.STATUS_NOT_WATCHED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = MovieStatsSerializer(user_movies, many=True, context={'request': request})
        movies = serializer.data

        user_shows = UserShow.objects.select_related('show') \
            .exclude(status=UserShow.STATUS_NOT_WATCHED) \
            .filter(user=user) \
            .order_by('-updated_at') \
            .annotate(watched_episodes_time=
                      Coalesce(Sum(Case(When(show__season__episode__tmdb_runtime=0, then='show__tmdb_episode_runtime'),
                                        default='show__season__episode__tmdb_runtime'),
                                   filter=Q(show__season__episode__userepisode__user=user) &
                                          ~Q(show__season__episode__userepisode__score=-1)), 0)) \
            .annotate(spent_time=ExpressionWrapper(Round(1.0 * F('watched_episodes_time') / MINUTES_IN_HOUR),
                                                   output_field=DecimalField()))

        serializer = ShowStatsSerializer(user_shows, many=True, context={'request': request})
        shows = serializer.data

        # followed_users
        followed_users = User.objects.filter(
            id__in=UserFollow.objects.filter(user=user, is_following=True).values('followed_user')) \
            .values('id', 'username')

        response_data = {'is_available': is_available, 'is_followed': user_is_followed,
                         'followed_users': followed_users,
                         'games': games, 'movies': movies, 'shows': shows}

        serializer = UserInfoSerializer(user)
        response_data.update(serializer.data)

        return Response(response_data)

    @action(detail=True, methods=['get'])
    def stats(self, request, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'), request.user)
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if not is_user_available(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        user_timezone = resolve_user_timezone(request.query_params.get('tz'))
        stats = {}
        user_games = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).filter(user=user)
        stats.update(calculate_games_stats(user_games, user))
        stats.update(calculate_movies_stats(user))
        stats.update(calculate_shows_stats(user))
        stats.update(calculate_top_personality_points(user))
        stats.update(calculate_status_funnel(user))
        stats.update(calculate_scores_stats(user))
        stats.update(calculate_time_distribution_last_year(user))
        stats.update(calculate_activity_stats(user, user_timezone))

        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['put'])
    def follow(self, request, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'), request.user)
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if not is_user_available(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        data.update({'user': request.user.pk, 'followed_user': user.pk})

        try:
            user_follow = UserFollow.objects.get(user=request.user, followed_user=user)
            serializer = UserFollowSerializer(user_follow, data=data, partial=True)
        except UserFollow.DoesNotExist:
            serializer = UserFollowSerializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def user_settings(self, request):
        if request.method == 'GET':
            serializer = SettingsSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        else:
            serializer = SettingsSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

            if user.privacy == user.PRIVACY_NOBODY:
                UserFollow.objects.filter(followed_user=user).update(is_following=False)
            elif user.privacy == user.PRIVACY_FOLLOWED:
                followed_users = UserFollow.objects.filter(user=user, is_following=True).values('followed_user')
                UserFollow.objects.filter(followed_user=user) \
                    .exclude(user__in=followed_users) \
                    .update(is_following=False)

            return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def random(self, request):
        categories_query = request.query_params.getlist('categories[]')
        count = request.GET.get('count', 10)
        try:
            count = int(count)
            if count < 1 or count > 100:
                return Response(status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        ended_only = request.GET.get('endedOnly', '')
        ended_only = ended_only == 'true'
        categories = []

        games = None
        movies = None
        shows = None
        games_len = 0
        movies_len = 0
        shows_len = 0
        today_date = datetime.today().date()

        if 'games' in categories_query:
            games = UserGame.objects.filter(user=request.user, status=UserGame.STATUS_GOING,
                                            game__rawg_release_date__lte=today_date)
            games_len = len(games)
            if games_len > 0:
                categories.append('games')
        if 'movies' in categories_query:
            movies = UserMovie.objects.filter(user=request.user, status=UserMovie.STATUS_GOING,
                                              movie__tmdb_release_date__lte=today_date)
            movies_len = len(movies)
            if movies_len > 0:
                categories.append('movies')
        if 'shows' in categories_query:
            if ended_only:
                shows = UserShow.objects.filter(user=request.user, status=UserShow.STATUS_GOING,
                                                show__tmdb_release_date__lte=today_date,
                                                show__tmdb_status__in=[Show.TMDB_STATUS_ENDED,
                                                                       Show.TMDB_STATUS_CANCELED])
            else:
                shows = UserShow.objects.filter(user=request.user, status=UserShow.STATUS_GOING,
                                                show__tmdb_release_date__lte=today_date)
            shows_len = len(shows)
            if shows_len > 0:
                categories.append('shows')

        entries_count = games_len + movies_len + shows_len
        games_chance = games_len / entries_count if entries_count > 0 else 0
        movies_chance = movies_len / entries_count if entries_count > 0 else 0
        shows_chance = shows_len / entries_count if entries_count > 0 else 0

        random_choices = random.choices(['game', 'movie', 'show'],
                                        weights=(games_chance, movies_chance, shows_chance), k=count)

        games_count = min(sum(item == 'game' for item in random_choices), games_len)
        movies_count = min(sum(item == 'movie' for item in random_choices), movies_len)
        shows_count = min(sum(item == 'show' for item in random_choices), shows_len)

        selected_entries = []
        if 'games' in categories:
            selected_games = [item.game for item in games.order_by('?')[:games_count].select_related('game')]
            selected_entries += TypedGameSerializer(selected_games, many=True).data
        if 'movies' in categories:
            selected_movies = [item.movie for item in movies.order_by('?')[:movies_count].select_related('movie')]
            selected_entries += TypedMovieSerializer(selected_movies, many=True, context={'request': request}).data
        if 'shows' in categories:
            selected_shows = [item.show for item in shows.order_by('?')[:shows_count].select_related('show')]
            selected_entries += TypedShowSerializer(selected_shows, many=True, context={'request': request}).data

        random.shuffle(selected_entries)
        return Response(selected_entries, status=status.HTTP_200_OK)


def calculate_games_stats(user_games: QuerySet, user: User) -> dict:
    if user_games.exists():
        games_total_spent_time = user_games.aggregate(total_spent_time=Sum('spent_time'))['total_spent_time']

        games_genres_spent_time = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .filter(user=user) \
            .values(name=F('game__gamegenre__genre__rawg_name')) \
            .annotate(spent_time_percent=Sum('spent_time'))

        if games_total_spent_time > 0:
            for genre in games_genres_spent_time:
                genre['spent_time_percent'] = round(genre['spent_time_percent'] * 100 / games_total_spent_time, 1)

        completed_games_by_years = user_games.exclude(status=UserGame.STATUS_GOING) \
            .annotate(year=ExtractYear('game__rawg_release_date')).values('year') \
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
    else:
        shows_total_spent_time = 0
        shows_genres_spent_time = []
        watched_shows_by_years = []

    result = {'episodes': {
        'count': watched_episodes.count(),
        'total_spent_time': shows_total_spent_time,
        'genres': shows_genres_spent_time,
        'years': watched_shows_by_years
    }}
    return result


def calculate_top_personality_points(user: User) -> dict:
    actors_points = collections.defaultdict(int)
    directors_points = collections.defaultdict(int)

    movies_persons = MoviePerson.objects \
        .filter(movie__usermovie__user=user,
                movie__usermovie__status__in=[UserMovie.STATUS_WATCHED, UserMovie.STATUS_STOPPED],
                movie__usermovie__score__gt=0) \
        .values('person__name', 'role') \
        .annotate(points=Sum('movie__usermovie__score'))

    shows_persons = ShowPerson.objects \
        .filter(show__usershow__user=user,
                show__usershow__score__gt=0) \
        .exclude(show__usershow__status__in=[UserShow.STATUS_NOT_WATCHED, UserShow.STATUS_GOING]) \
        .values('person__name', 'role') \
        .annotate(points=Sum('show__usershow__score'))

    for item in chain(movies_persons, shows_persons):
        name = item.get('person__name')
        role = item.get('role')
        points = int(item.get('points') or 0)
        if not name:
            continue

        if role == MoviePerson.ROLE_ACTOR:
            actors_points[name] += points
        elif role == MoviePerson.ROLE_DIRECTOR:
            directors_points[name] += points

    top_actors = [{'name': name, 'points': points} for name, points in actors_points.items()]
    top_actors.sort(key=lambda entry: (-entry['points'], entry['name']))
    top_actors = top_actors[:10]

    top_directors = [{'name': name, 'points': points} for name, points in directors_points.items()]
    top_directors.sort(key=lambda entry: (-entry['points'], entry['name']))
    top_directors = top_directors[:10]

    return {'top_actors': top_actors, 'top_directors': top_directors}


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


def calculate_time_distribution_last_year(user: User) -> dict:
    cutoff = timezone.now() - timedelta(days=365)

    games_time = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
        .filter(user=user, updated_at__gte=cutoff) \
        .aggregate(total_spent_time=Sum('spent_time'))['total_spent_time'] or 0

    movies_minutes = UserMovie.objects.filter(user=user, status=UserMovie.STATUS_WATCHED, updated_at__gte=cutoff) \
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

    return {
        'time_distribution_last_year': {
            'games': float(games_time),
            'movies': round(movies_minutes / MINUTES_IN_HOUR, 1),
            'episodes': round(episodes_minutes / MINUTES_IN_HOUR, 1),
        }
    }


def calculate_activity_stats(user: User, user_timezone=None) -> dict:
    effective_timezone = user_timezone or timezone.get_current_timezone()
    heatmap = [[0 for _ in range(24)] for _ in range(7)]
    active_dates = set()
    total_events = 0
    active_minutes_by_cell = collections.defaultdict(set)

    log_datetimes = chain(
        GameLog.objects.filter(user=user).values_list('created', flat=True),
        MovieLog.objects.filter(user=user).values_list('created', flat=True),
        ShowLog.objects.filter(user=user).values_list('created', flat=True),
        SeasonLog.objects.filter(user=user).values_list('created', flat=True),
        EpisodeLog.objects.filter(user=user).values_list('created', flat=True),
        UserLog.objects.filter(user=user).values_list('created', flat=True),
    )

    for dt in log_datetimes:
        if dt is None:
            continue
        local_dt = timezone.localtime(dt, timezone=effective_timezone)
        day_index = local_dt.weekday()  # Monday=0 ... Sunday=6
        hour_index = local_dt.hour
        active_minutes_by_cell[(day_index, hour_index)].add(local_dt.minute)
        active_dates.add(local_dt.date())
        total_events += 1

    for day_index in range(7):
        for hour_index in range(24):
            # Burst protection: count unique active minutes, not raw event count.
            heatmap[day_index][hour_index] = len(active_minutes_by_cell[(day_index, hour_index)])

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
    day_cursor = timezone.localdate(timezone=effective_timezone)
    while day_cursor in active_dates:
        current_streak += 1
        day_cursor -= timedelta(days=1)

    days = [
        {'key': 'mon', 'label': 'Пн', 'hours': heatmap[0]},
        {'key': 'tue', 'label': 'Вт', 'hours': heatmap[1]},
        {'key': 'wed', 'label': 'Ср', 'hours': heatmap[2]},
        {'key': 'thu', 'label': 'Чт', 'hours': heatmap[3]},
        {'key': 'fri', 'label': 'Пт', 'hours': heatmap[4]},
        {'key': 'sat', 'label': 'Сб', 'hours': heatmap[5]},
        {'key': 'sun', 'label': 'Вс', 'hours': heatmap[6]},
    ]

    return {
        'activity': {
            'days': days,
            'total_events': total_events,
            'active_days': len(active_dates),
            'streak': {
                'current': current_streak,
                'longest': longest_streak,
            },
        }
    }


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
        else:
            serializer = UserLogSerializer(entry)
        results.append(serializer.data)
    return results


def get_logs(user_query, page_size, page_number, search_query, filters):
    page_size = get_page_size(page_size)
    page = page_number

    game_logs = movie_logs = show_logs = season_logs = episode_logs = user_logs = []

    for user_filter in filters:
        if user_filter == TYPE_GAME:
            game_logs = GameLog.objects.select_related('user', 'game') \
                .filter(user__in=user_query, game__rawg_name__icontains=search_query)
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

    union_logs = sorted(chain(game_logs, movie_logs, show_logs, season_logs, episode_logs, user_logs),
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
