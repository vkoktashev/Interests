import collections
import secrets
from datetime import datetime
from itertools import chain
from smtplib import SMTPAuthenticationError

from django.core.mail import EmailMessage
from django.core.paginator import Paginator
from django.db.models import Sum, F, Count, Q, ExpressionWrapper, DecimalField
from django.template.defaultfilters import lower
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenObtainPairView

from config.settings import EMAIL_HOST_USER
from games.models import UserGame, GameLog, Game
from games.serializers import GameStatsSerializer, GameLogSerializer, GameSerializer
from movies.models import UserMovie, MovieLog, Movie
from movies.serializers import MovieLogSerializer, MovieStatsSerializer, MovieSerializer
from shows.models import UserShow, UserEpisode, ShowLog, EpisodeLog, SeasonLog, Show, Episode
from shows.serializers import ShowStatsSerializer, ShowLogSerializer, SeasonLogSerializer, EpisodeLogSerializer, \
    EpisodeSerializer
from users.serializers import UserSerializer, MyTokenObtainPairSerializer, UserFollowSerializer, UserLogSerializer, \
    UserNotificationSerializer
from utils.constants import ERROR, WRONG_URL, ID_VALUE_ERROR, \
    USER_NOT_FOUND, EMAIL_ERROR, MINUTES_IN_HOUR, SITE_URL
from utils.documentation import USER_SIGNUP_201_EXAMPLE, USER_SIGNUP_400_EXAMPLE, USER_LOG_200_EXAMPLE, \
    USER_RETRIEVE_200_EXAMPLE, USER_SEARCH_200_EXAMPLE
from utils.functions import similar, get_page_size
from utils.models import Round
from utils.openapi_params import page_param, page_size_param, query_param, uid64_param, token_param, reset_token_param
from .models import User, UserFollow, UserLog, UserPasswordToken
from .tokens import account_activation_token


class AuthViewSet(GenericViewSet):
    @swagger_auto_schema(request_body=UserSerializer,
                         responses={
                             status.HTTP_201_CREATED: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": USER_SIGNUP_201_EXAMPLE
                                 }
                             ),
                             status.HTTP_400_BAD_REQUEST: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": USER_SIGNUP_400_EXAMPLE
                                 }
                             )
                         })
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def signup(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        mail_subject = 'Активация аккаунта.'
        uid64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        activation_link = f"{request.scheme}://{SITE_URL}/confirm/?uid64={uid64}&token={token}"
        message = f"Привет {user.username}, для активации аккаунта перейди по ссылке:\n{activation_link}"
        email = EmailMessage(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
        try:
            email.send()
            # print(activation_link)
        except SMTPAuthenticationError:
            return Response({ERROR: EMAIL_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(manual_parameters=[uid64_param, token_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": USER_RETRIEVE_200_EXAMPLE
                                 }
                             ),
                             status.HTTP_400_BAD_REQUEST: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": {ERROR: WRONG_URL}
                                 }
                             )
                         })
    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirm_email(self, request, *args, **kwargs):
        try:
            uid = force_text(urlsafe_base64_decode(request.query_params.get('uid64')))
            user = User.objects.get(pk=uid)
        except(TypeError, ValueError, OverflowError, AttributeError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, request.query_params.get('token')):
            user.is_active = True
            user.save()
            serializer = UserSerializer(instance=user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({ERROR: WRONG_URL}, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "email": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_EMAIL
                )
            }
        ),
        responses={
            status.HTTP_200_OK: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": None
                }
            ),
            status.HTTP_404_NOT_FOUND: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": {ERROR: USER_NOT_FOUND}
                }
            )
        })
    @action(detail=False, methods=['put'], permission_classes=[AllowAny])
    def password_reset(self, request, *args, **kwargs):
        email = request.data.get('email')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        reset_token = secrets.token_urlsafe()

        try:
            user_password_token = UserPasswordToken.objects.get(user=user)
            user_password_token.reset_token = reset_token
            user_password_token.is_active = True
        except UserPasswordToken.DoesNotExist:
            user_password_token = UserPasswordToken.objects.create(user=user, reset_token=reset_token)

        user_password_token.save()

        mail_subject = 'Сброс пароля.'
        activation_link = f"{request.scheme}://{SITE_URL}/" \
                          f"confirm_password/?token={urlsafe_base64_encode(force_bytes(reset_token))}"
        message = f"Привет {user.username}, вот твоя ссылка:\n{activation_link}"
        email = EmailMessage(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
        try:
            email.send()
            # print(activation_link)
        except SMTPAuthenticationError:
            return Response({ERROR: EMAIL_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(status=status.HTTP_200_OK)

    @swagger_auto_schema(manual_parameters=[reset_token_param],
                         request_body=openapi.Schema(
                             type=openapi.TYPE_OBJECT,
                             properties={
                                 'password': openapi.Schema(type=openapi.TYPE_STRING),
                             }
                         ))
    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirm_password_reset(self, request, *args, **kwargs):
        try:
            reset_token = force_text(urlsafe_base64_decode(request.query_params.get('reset_token')))
            password = request.data.get('password')
            user_password_token = UserPasswordToken.objects.get(reset_token=reset_token)
            user = User.objects.get(id=user_password_token.user.id)
        except(TypeError, ValueError, OverflowError, AttributeError, User.DoesNotExist, UserPasswordToken.DoesNotExist):
            return Response({ERROR: WRONG_URL}, status=status.HTTP_400_BAD_REQUEST)

        if user_password_token.is_active:
            serializer = UserSerializer(instance=user, data={'password': password}, partial=True)
            serializer.is_valid(raise_exception=True)
            user_password_token.is_active = False
            user_password_token.save()
            serializer.save()
            return Response(data=serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({ERROR: WRONG_URL}, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": USER_LOG_200_EXAMPLE
                                 }
                             ),
                             status.HTTP_400_BAD_REQUEST: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": {ERROR: ID_VALUE_ERROR}
                                 }
                             ),
                             status.HTTP_404_NOT_FOUND: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": {ERROR: USER_NOT_FOUND}
                                 }
                             )
                         })
    @action(detail=True, methods=['get'])
    def log(self, request, *args, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        results, has_next_page = get_logs((user,), request.GET.get('page_size'), request.GET.get('page'))

        return Response({'log': results, 'has_next_page': has_next_page})

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": USER_LOG_200_EXAMPLE
                                 }
                             ),
                             status.HTTP_400_BAD_REQUEST: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": {ERROR: ID_VALUE_ERROR}
                                 }
                             ),
                             status.HTTP_404_NOT_FOUND: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": {ERROR: USER_NOT_FOUND}
                                 }
                             )
                         })
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_log(self, request, *args, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        user_follow_query = UserFollow.objects.filter(user=user).values('followed_user')
        results, has_next_page = get_logs(user_follow_query, request.GET.get('page_size'), request.GET.get('page'))

        return Response({'log': results, 'has_next_page': has_next_page})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def release_calendar(self, request, *args, **kwargs):
        today_date = datetime.today().date()
        calendar_dict = collections.defaultdict(dict)

        # games
        games = Game.objects \
            .filter(usergame__user=request.user, rawg_release_date__gte=today_date) \
            .exclude(usergame__status=UserGame.STATUS_NOT_PLAYED) \
            .exclude(usergame__status=UserGame.STATUS_STOPPED)

        for game in games:
            rawg_release_date_str = str(game.rawg_release_date)
            release_date = calendar_dict[rawg_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[rawg_release_date_str] = release_date

            release_date['games'].append(GameSerializer(game).data)

        # movies
        movies = Movie.objects \
            .filter(usermovie__user=request.user, tmdb_release_date__gte=today_date) \
            .exclude(usermovie__status=UserMovie.STATUS_NOT_WATCHED) \
            .exclude(usermovie__status=UserMovie.STATUS_STOPPED)

        for movie in movies:
            tmdb_release_date_str = str(movie.tmdb_release_date)
            release_date = calendar_dict[tmdb_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[tmdb_release_date_str] = release_date

            release_date['movies'].append(MovieSerializer(movie).data)

        # episodes
        shows = Show.objects.filter(usershow__user=request.user) \
            .exclude(usershow__status=UserShow.STATUS_NOT_WATCHED) \
            .exclude(usershow__status=UserShow.STATUS_STOPPED)

        episodes = Episode.objects.select_related('tmdb_season').filter(tmdb_season__tmdb_show__in=shows,
                                                                        tmdb_release_date__gte=today_date)
        for episode in episodes:
            tmdb_release_date_str = str(episode.tmdb_release_date)
            release_date = calendar_dict[tmdb_release_date_str]

            if not release_date:
                release_date = collections.defaultdict(list)
                calendar_dict[tmdb_release_date_str] = release_date

            release_date['episodes'].append(EpisodeSerializer(episode).data)

        calendar_dict = dict(sorted(calendar_dict.items()))

        return Response(calendar_dict, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        responses={
            status.HTTP_200_OK: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": USER_RETRIEVE_200_EXAMPLE
                }
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": {ERROR: ID_VALUE_ERROR}
                }
            ),
            status.HTTP_404_NOT_FOUND: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": {ERROR: USER_NOT_FOUND}
                }
            )
        })
    def retrieve(self, request, *args, **kwargs):
        try:
            user = get_user_by_id(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        try:
            user_is_followed = UserFollow.objects.get(user=request.user, followed_user=user).is_following
        except (UserFollow.DoesNotExist, TypeError):
            user_is_followed = False

        stats = {}

        # games
        user_games = UserGame.objects.prefetch_related('game')
        user_games = user_games.exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = GameStatsSerializer(user_games, many=True)
        games = serializer.data
        # games stats
        if user_games.exists():
            games_total_spent_time = user_games.aggregate(total_spent_time=Sum('spent_time'))['total_spent_time']

            games_genres_spent_time = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
                .filter(user=user) \
                .values(name=F('game__gamegenre__genre__rawg_name')) \
                .annotate(spent_time_percent=Sum('spent_time'))

            if games_total_spent_time > 0:
                for genre in games_genres_spent_time:
                    genre['spent_time_percent'] = round(genre['spent_time_percent'] * 100 / games_total_spent_time, 1)

        else:
            games_total_spent_time = 0
            games_genres_spent_time = []

        stats.update({'games': {
            'count': user_games.count(),
            'total_spent_time': games_total_spent_time,
            'genres': games_genres_spent_time
        }})

        # movies
        user_movies = UserMovie.objects.prefetch_related('movie')
        user_movies = user_movies.exclude(status=UserMovie.STATUS_NOT_WATCHED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = MovieStatsSerializer(user_movies, many=True)
        movies = serializer.data
        # movies stats
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
        else:
            movies_total_spent_time = 0
            movies_genres_spent_time = []

        stats.update({'movies': {
            'count': watched_movies.count(),
            'total_spent_time': movies_total_spent_time,
            'genres': movies_genres_spent_time
        }})

        # shows
        user_shows = UserShow.objects.prefetch_related('show')
        user_shows = user_shows.exclude(status=UserShow.STATUS_NOT_WATCHED) \
            .filter(user=user) \
            .order_by('-updated_at') \
            .annotate(watched_episodes_count=Count('show__season__episode',
                                                   filter=Q(show__season__episode__userepisode__user=user) &
                                                          ~Q(show__season__episode__userepisode__score=-1))) \
            .annotate(spent_time=ExpressionWrapper(
            Round(1.0 * F('show__tmdb_episode_run_time') * F('watched_episodes_count') / MINUTES_IN_HOUR),
            output_field=DecimalField()))

        serializer = ShowStatsSerializer(user_shows, many=True)
        shows = serializer.data
        # shows stats
        watched_episodes = UserEpisode.objects.exclude(score=-1).filter(user=user)
        if watched_episodes.exists():
            shows_total_spent_time = watched_episodes.aggregate(
                total_spent_time=Sum('episode__tmdb_season__tmdb_show__tmdb_episode_run_time'))['total_spent_time']

            shows_genres_spent_time = watched_episodes. \
                values(name=F('episode__tmdb_season__tmdb_show__showgenre__genre__tmdb_name')) \
                .annotate(spent_time_percent=Sum('episode__tmdb_season__tmdb_show__tmdb_episode_run_time'))

            for genre in shows_genres_spent_time:
                genre['spent_time_percent'] = round(genre['spent_time_percent'] * 100 /
                                                    shows_total_spent_time, 1)

            shows_total_spent_time = round(shows_total_spent_time / MINUTES_IN_HOUR, 1)
        else:
            shows_total_spent_time = 0
            shows_genres_spent_time = []

        stats.update({'episodes': {
            'count': watched_episodes.count(),
            'total_spent_time': shows_total_spent_time,
            'genres': shows_genres_spent_time
        }})

        # followed_users
        followed_users = User.objects.filter(id__in=UserFollow.objects
                                             .filter(user=user, is_following=True).values('followed_user')) \
            .values('id', 'username')

        return Response({'id': user.id, 'username': user.username, 'is_followed': user_is_followed,
                         'followed_users': followed_users, 'last_activity': user.last_activity,
                         'games': games, 'movies': movies, 'shows': shows, 'stats': stats})

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "is_following": openapi.Schema(
                    type=openapi.TYPE_BOOLEAN
                )
            }
        ),
        responses={
            status.HTTP_200_OK: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": {
                        "is_following": True,
                        "followed_user": 0
                    }
                }
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description=status.HTTP_200_OK,
                examples={
                    "application/json": {ERROR: ID_VALUE_ERROR}
                }
            )
        })
    @action(detail=True, methods=['put'])
    def follow(self, request, *args, **kwargs):
        try:
            user_id = int(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        data.update({'user': request.user.pk, 'followed_user': user_id})

        try:
            user_follow = UserFollow.objects.get(user=request.user, followed_user=user_id)
            serializer = UserFollowSerializer(user_follow, data=data, partial=True)
        except UserFollow.DoesNotExist:
            serializer = UserFollowSerializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch'])
    def notification_preferences(self, request):
        serializer = UserNotificationSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)


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


def get_logs(user_query, page_size, page_number):
    page_size = get_page_size(page_size)
    page = page_number

    game_logs = GameLog.objects.select_related('user').prefetch_related('game').filter(user__in=user_query)
    movie_logs = MovieLog.objects.select_related('user').prefetch_related('movie').filter(user__in=user_query)
    show_logs = ShowLog.objects.select_related('user').prefetch_related('show').filter(user__in=user_query)
    season_logs = SeasonLog.objects.select_related('user') \
        .prefetch_related('season__tmdb_show') \
        .filter(user__in=user_query)
    episode_logs = EpisodeLog.objects.select_related('user') \
        .prefetch_related('episode').prefetch_related('episode__tmdb_season') \
        .filter(user__in=user_query)
    user_logs = UserLog.objects.select_related('user').select_related('followed_user').filter(user__in=user_query)

    union_logs = sorted(chain(game_logs, movie_logs, show_logs, season_logs, episode_logs, user_logs),
                        key=lambda obj: obj.created, reverse=True)

    paginator = Paginator(union_logs, page_size)
    paginator_page = paginator.get_page(page)

    results = serialize_logs(paginator_page.object_list)
    return results, paginator_page.has_next()


def get_user_by_id(user_id):
    try:
        user_id = int(user_id)
    except ValueError:
        raise ValueError()

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise User.DoesNotExist()

    return user


class SearchUsersViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": USER_SEARCH_200_EXAMPLE
                                 }
                             )
                         })
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        results = []
        for user in User.objects.all():
            similarity = similar(lower(query), lower(user.username))  # similarity is 0.0-1.0
            if similarity > 0.4:
                user.similarity = similarity
                results.append(user)
        results.sort(key=lambda u: u.similarity, reverse=True)
        serializer = UserSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
