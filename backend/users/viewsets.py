import collections
import random
from datetime import datetime, timedelta
from itertools import chain
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.paginator import Paginator
from django.db.models import Sum, F, Count, Q, ExpressionWrapper, DecimalField, QuerySet, Case, When, IntegerField, \
    FloatField, Value
from django.db.models.functions import ExtractYear, Coalesce
from django.utils import timezone
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenRefreshView

from games.models import UserGame, GameLog, Game, GameDeveloper, GameBeatTime
from games.serializers import GameStatsSerializer, GameLogSerializer, GameSerializer, TypedGameSerializer
from movies.models import UserMovie, MovieLog, Movie, MoviePerson
from movies.serializers import MovieLogSerializer, MovieStatsSerializer, MovieSerializer, TypedMovieSerializer
from people.models import PersonLog, UserPerson
from people.serializers import PersonLogSerializer
from proxy.functions import get_proxy_url
from shows.models import UserShow, UserEpisode, ShowLog, EpisodeLog, SeasonLog, Show, Episode, ShowPerson, \
    SeasonPerson, EpisodePerson
from shows.serializers import ShowStatsSerializer, ShowLogSerializer, SeasonLogSerializer, EpisodeLogSerializer, \
    EpisodeShowSerializer, TypedShowSerializer
from users.serializers import UserFollowSerializer, UserLogSerializer, \
    UserInfoSerializer, SettingsSerializer, UserSerializer, MyTokenRefreshSerializer
from utils.constants import ERROR, ID_VALUE_ERROR, \
    USER_NOT_FOUND, MINUTES_IN_HOUR, TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, \
    TYPE_SEASON, TYPE_EPISODE, TYPE_USER, TYPE_PERSON, CANNOT_DELETE_ANOTHER_USER_LOG, WRONG_LOG_TYPE, LOG_NOT_FOUND
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


def add_movie_calendar_releases(calendar_dict, movie, today_date):
    movie_data = dict(MovieSerializer(movie).data)

    if movie.tmdb_release_date and movie.tmdb_release_date >= today_date:
        release_date_str = str(movie.tmdb_release_date)
        release_date = calendar_dict[release_date_str]
        if not release_date:
            release_date = collections.defaultdict(list)
            calendar_dict[release_date_str] = release_date
        release_date['movies'].append({
            **movie_data,
            'calendar_release_type': 'theatrical',
        })

    if (movie.tmdb_digital_release_date and
            movie.tmdb_digital_release_date >= today_date and
            movie.tmdb_digital_release_date != movie.tmdb_release_date):
        release_date_str = str(movie.tmdb_digital_release_date)
        release_date = calendar_dict[release_date_str]
        if not release_date:
            release_date = collections.defaultdict(list)
            calendar_dict[release_date_str] = release_date
        release_date['movies'].append({
            **movie_data,
            'calendar_release_type': 'digital',
        })


def order_game_calendar_releases(games: QuerySet) -> QuerySet:
    return games.annotate(
        calendar_release_precision=Case(
            When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_EXACT, then=0),
            When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_MONTH, then=1),
            When(
                igdb_release_date_format__in=[
                    Game.IGDB_RELEASE_DATE_FORMAT_Q1,
                    Game.IGDB_RELEASE_DATE_FORMAT_Q2,
                    Game.IGDB_RELEASE_DATE_FORMAT_Q3,
                    Game.IGDB_RELEASE_DATE_FORMAT_Q4,
                ],
                then=2,
            ),
            When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_YEAR, then=3),
            When(igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_TBD, then=4),
            default=5,
            output_field=IntegerField(),
        )
    ).order_by('release_date', 'calendar_release_precision', 'igdb_name', 'id')


def format_person_life_years(person):
    birth_year = person.tmdb_birthday.year if person.tmdb_birthday else None
    death_year = person.tmdb_deathday.year if person.tmdb_deathday else None

    if birth_year:
        return f'{birth_year}–{death_year or "н.в."}'
    if death_year:
        return str(death_year)
    return ''


def get_tracked_people(request, user, user_movies, user_shows):
    tracked_people = list(UserPerson.objects.select_related('person').filter(user=user))
    if not tracked_people:
        return []

    person_ids = [user_person.person_id for user_person in tracked_people]
    marked_movies = {
        user_movie.movie_id: {
            'type': TYPE_MOVIE,
            'id': user_movie.movie.tmdb_id,
            'name': user_movie.movie.tmdb_name or user_movie.movie.tmdb_original_name or 'Без названия',
            'year': user_movie.movie.tmdb_release_date.year if user_movie.movie.tmdb_release_date else None,
            '_updated_at': user_movie.updated_at,
        }
        for user_movie in user_movies
    }
    marked_shows = {
        user_show.show_id: {
            'type': TYPE_SHOW,
            'id': user_show.show.tmdb_id,
            'name': user_show.show.tmdb_name or user_show.show.tmdb_original_name or 'Без названия',
            'year': user_show.show.tmdb_release_date.year if user_show.show.tmdb_release_date else None,
            '_updated_at': user_show.updated_at,
        }
        for user_show in user_shows
    }

    project_keys_by_person = collections.defaultdict(set)

    for person_id, movie_id in MoviePerson.objects.filter(
            person_id__in=person_ids,
            movie_id__in=marked_movies,
    ).values_list('person_id', 'movie_id'):
        project_keys_by_person[person_id].add((TYPE_MOVIE, movie_id))

    show_person_pairs = chain(
        ShowPerson.objects.filter(
            person_id__in=person_ids,
            show_id__in=marked_shows,
        ).values_list('person_id', 'show_id'),
        SeasonPerson.objects.filter(
            person_id__in=person_ids,
            season__tmdb_show_id__in=marked_shows,
        ).values_list('person_id', 'season__tmdb_show_id'),
        EpisodePerson.objects.filter(
            person_id__in=person_ids,
            episode__tmdb_season__tmdb_show_id__in=marked_shows,
        ).values_list('person_id', 'episode__tmdb_season__tmdb_show_id'),
    )
    for person_id, show_id in show_person_pairs:
        project_keys_by_person[person_id].add((TYPE_SHOW, show_id))

    projects_by_key = {
        **{(TYPE_MOVIE, movie_id): project for movie_id, project in marked_movies.items()},
        **{(TYPE_SHOW, show_id): project for show_id, project in marked_shows.items()},
    }
    result = []

    for user_person in tracked_people:
        person = user_person.person
        projects = sorted(
            (projects_by_key[key] for key in project_keys_by_person[person.id]),
            key=lambda project: project['_updated_at'],
            reverse=True,
        )
        result.append({
            'id': person.id,
            'tmdb_id': person.tmdb_id,
            'name': person.name,
            'profile_path': get_proxy_url(request, person.tmdb_profile_path),
            'life_years': format_person_life_years(person),
            'projects': [
                {key: value for key, value in project.items() if key != '_updated_at'}
                for project in projects
            ],
        })

    return result


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
                                                                   (TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, TYPE_USER,
                                                                    TYPE_PERSON)))

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
            elif log_type == TYPE_PERSON:
                Model = PersonLog
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
                                                               (TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, TYPE_USER,
                                                                TYPE_PERSON)))

        return Response({'log': results, 'count': count})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def release_calendar(self, request):
        today_date = datetime.today().date()
        calendar_dict = collections.defaultdict(dict)

        # games
        games = order_game_calendar_releases(Game.objects.annotate(
            release_date=F('igdb_release_date')
        ).filter(
            Q(usergame__user=request.user, release_date__gte=today_date) &
            ~Q(
                usergame__user=request.user,
                usergame__status__in=[UserGame.STATUS_NOT_PLAYED, UserGame.STATUS_STOPPED],
            )
        ))
        for game in games:
            release_date_str = str(game.release_date)
            release_date = calendar_dict[release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[release_date_str] = release_date

            release_date['games'].append(GameSerializer(game).data)

        # movies
        movies = Movie.objects \
            .filter(Q(usermovie__user=request.user) &
                    ~Q(usermovie__user=request.user, usermovie__status__in=[UserMovie.STATUS_NOT_WATCHED,
                                                                            UserMovie.STATUS_STOPPED])) \
            .filter(Q(tmdb_release_date__gte=today_date) |
                    Q(tmdb_digital_release_date__gte=today_date)) \
            .distinct()

        for movie in movies:
            add_movie_calendar_releases(calendar_dict, movie, today_date)

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

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], authentication_classes=[])
    def full_release_calendar(self, request):
        today_date = datetime.today().date()
        calendar_dict = collections.defaultdict(dict)

        # games
        games = order_game_calendar_releases(Game.objects.annotate(
            release_date=F('igdb_release_date')
        ).filter(release_date__gte=today_date))
        for game in games:
            release_date_str = str(game.release_date)
            release_date = calendar_dict[release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[release_date_str] = release_date

            release_date['games'].append(GameSerializer(game).data)

        # movies
        movies = Movie.objects.filter(
            Q(tmdb_release_date__gte=today_date) |
            Q(tmdb_digital_release_date__gte=today_date)
        )

        for movie in movies:
            add_movie_calendar_releases(calendar_dict, movie, today_date)

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
            .annotate(watched_episodes_count=Coalesce(
                Count(
                    'show__season__episode__userepisode__id',
                    filter=Q(show__season__episode__userepisode__user=user) &
                           ~Q(show__season__episode__userepisode__score=-1) &
                           ~Q(show__season__tmdb_season_number=0),
                    distinct=True,
                ),
                0,
            )) \
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
            .values('id', 'username', 'gender')

        tracked_people = get_tracked_people(request, user, user_movies, user_shows)

        response_data = {'is_available': is_available, 'is_followed': user_is_followed,
                         'followed_users': followed_users, 'tracked_people': tracked_people,
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
        stats.update(calculate_backlog_metrics(user))
        stats.update(calculate_time_distribution_last_year(user))
        stats.update(calculate_activity_stats(user, user_timezone))

        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='top-personalities')
    def top_personalities(self, request, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'), request.user)
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        if not is_user_available(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        top_type = request.query_params.get('type')
        calculators = {
            'actors': calculate_top_actor_points,
            'directors': calculate_top_director_points,
            'studios': calculate_top_developer_points,
        }
        calculator = calculators.get(top_type)
        if calculator is None:
            return Response(
                {ERROR: 'Type must be one of: actors, directors, studios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({'results': calculator(user)}, status=status.HTTP_200_OK)

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
        all_from_db = request.GET.get('allFromDb', '')
        all_from_db = all_from_db == 'true'
        categories = []

        games = None
        movies = None
        shows = None
        games_len = 0
        movies_len = 0
        shows_len = 0
        today_date = datetime.today().date()

        if 'games' in categories_query:
            if all_from_db:
                games = Game.objects.annotate(
                    release_date=F('igdb_release_date')
                ).filter(release_date__lte=today_date) \
                    .exclude(
                        usergame__user=request.user,
                        usergame__status__in=[
                            UserGame.STATUS_PLAYING,
                            UserGame.STATUS_COMPLETED,
                            UserGame.STATUS_STOPPED,
                        ]
                    ).distinct()
            else:
                games = UserGame.objects.annotate(
                    game_release_date=F('game__igdb_release_date')
                ).filter(
                    user=request.user,
                    status=UserGame.STATUS_GOING,
                    game_release_date__lte=today_date,
                )
            games_len = len(games)
            if games_len > 0:
                categories.append('games')
        if 'movies' in categories_query:
            if all_from_db:
                movies = Movie.objects.filter(tmdb_release_date__lte=today_date) \
                    .exclude(
                        usermovie__user=request.user,
                        usermovie__status__in=[
                            UserMovie.STATUS_WATCHED,
                            UserMovie.STATUS_STOPPED,
                        ]
                    ).distinct()
            else:
                movies = UserMovie.objects.filter(user=request.user, status=UserMovie.STATUS_GOING,
                                                  movie__tmdb_release_date__lte=today_date)
            movies_len = len(movies)
            if movies_len > 0:
                categories.append('movies')
        if 'shows' in categories_query:
            if all_from_db:
                show_filters = {
                    'tmdb_release_date__lte': today_date,
                }
                if ended_only:
                    show_filters['tmdb_status__in'] = [Show.TMDB_STATUS_ENDED, Show.TMDB_STATUS_CANCELED]
                shows = Show.objects.filter(**show_filters) \
                    .exclude(
                        usershow__user=request.user,
                        usershow__status__in=[
                            UserShow.STATUS_WATCHED,
                            UserShow.STATUS_STOPPED,
                            UserShow.STATUS_WATCHING,
                        ]
                    ).distinct()
            else:
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
            if all_from_db:
                selected_games = list(games.order_by('?')[:games_count])
            else:
                selected_games = [item.game for item in games.order_by('?')[:games_count].select_related('game')]
            selected_entries += TypedGameSerializer(selected_games, many=True).data
        if 'movies' in categories:
            if all_from_db:
                selected_movies = list(movies.order_by('?')[:movies_count])
            else:
                selected_movies = [item.movie for item in movies.order_by('?')[:movies_count].select_related('movie')]
            selected_entries += TypedMovieSerializer(selected_movies, many=True, context={'request': request}).data
        if 'shows' in categories:
            if all_from_db:
                selected_shows = list(shows.order_by('?')[:shows_count])
            else:
                selected_shows = [item.show for item in shows.order_by('?')[:shows_count].select_related('show')]
            selected_entries += TypedShowSerializer(selected_shows, many=True, context={'request': request}).data

        random.shuffle(selected_entries)
        return Response(selected_entries, status=status.HTTP_200_OK)


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
                show__usershow__status__in=[
                    UserShow.STATUS_WATCHING,
                    UserShow.STATUS_WATCHED,
                    UserShow.STATUS_STOPPED,
                ]) \
        .values('person__id', 'person__tmdb_id', 'person__name') \
        .annotate(points=Sum('show__usershow__score'))

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
        points = int(item.get('points') or 0)
        if person_tmdb_id is None or person_id is None or not name:
            continue

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
        .values('person__id', 'person__tmdb_id', 'person__name') \
        .annotate(points=Sum('show__usershow__score'))

    for item in chain(movies_directors, shows_directors):
        person_tmdb_id = item.get('person__tmdb_id')
        person_id = item.get('person__id')
        name = item.get('person__name')
        points = int(item.get('points') or 0)
        if person_tmdb_id is None or person_id is None or not name:
            continue

        current = directors_points.get(person_tmdb_id)
        if current is None:
            directors_points[person_tmdb_id] = {'id': person_id, 'name': name, 'points': points}
        else:
            current['points'] += points

    top_directors = [
        {'id': item['id'], 'name': item['name'], 'points': item['points']}
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

    planned_games = UserGame.objects.filter(user=user, status=UserGame.STATUS_GOING)
    planned_movies = UserMovie.objects.filter(user=user, status=UserMovie.STATUS_GOING)
    planned_shows = UserShow.objects.filter(user=user, status=UserShow.STATUS_GOING)
    eligible_shows = UserShow.objects.filter(user=user).exclude(
        status__in=[UserShow.STATUS_NOT_WATCHED, UserShow.STATUS_STOPPED]
    )

    def average_age_days(values):
        datetimes = [item for item in values if item is not None]
        if not datetimes:
            return 0
        age_seconds = sum((now - dt).total_seconds() for dt in datetimes)
        return round(age_seconds / len(datetimes) / 86400, 1)

    games_updated = list(planned_games.values_list('updated_at', flat=True))
    movies_updated = list(planned_movies.values_list('updated_at', flat=True))
    shows_updated = list(planned_shows.values_list('updated_at', flat=True))
    all_updated = games_updated + movies_updated + shows_updated

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
                'games': average_age_days(games_updated),
                'movies': average_age_days(movies_updated),
                'shows': average_age_days(shows_updated),
                'overall': average_age_days(all_updated),
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
