import secrets
from itertools import chain
from smtplib import SMTPAuthenticationError

from django.core.mail import EmailMessage
from django.core.paginator import Paginator
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
from games.models import UserGame, GameLog
from games.serializers import GameStatsSerializer, GameLogSerializer
from movies.models import UserMovie, MovieLog
from movies.serializers import MovieLogSerializer, MovieStatsSerializer
from shows.models import UserShow, UserEpisode, ShowLog, EpisodeLog, SeasonLog
from shows.serializers import ShowStatsSerializer, ShowLogSerializer, SeasonLogSerializer, EpisodeLogSerializer
from users.serializers import UserSerializer, MyTokenObtainPairSerializer, UserFollowSerializer, UserLogSerializer
from utils.constants import ERROR, WRONG_URL, ID_VALUE_ERROR, \
    USER_NOT_FOUND, EMAIL_ERROR
from utils.documentation import USER_SIGNUP_201_EXAMPLE, USER_SIGNUP_400_EXAMPLE, USER_LOG_200_EXAMPLE, \
    USER_RETRIEVE_200_EXAMPLE, USER_SEARCH_200_EXAMPLE
from utils.functions import similar, get_page_size
from utils.openapi_params import page_param, page_size_param, query_param, uid64_param, token_param, reset_token_param
from .models import User, UserFollow, UserLog, UserPasswordToken
from .tokens import account_activation_token

SITE_URL = 'localhost:3000'
MINUTES_IN_HOUR = 60


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
            # email.send()
            print(activation_link)
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
            user_id = int(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
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
            user_id = int(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        user_follow_query = UserFollow.objects.filter(user=user).values('followed_user')
        results, has_next_page = get_logs(user_follow_query, request.GET.get('page_size'), request.GET.get('page'))

        return Response({'log': results, 'has_next_page': has_next_page})

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
            user_id = int(kwargs.get('pk'))
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        try:
            user_is_followed = UserFollow.objects.get(user=request.user, followed_user=user).is_following
        except (UserFollow.DoesNotExist, TypeError):
            user_is_followed = False

        stats = {}

        # games
        user_games = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = GameStatsSerializer(user_games, many=True)
        games = serializer.data
        # games stats
        stats.update({'games': {
            'count': len(user_games),
            'total_spent_time': sum(el.spent_time for el in user_games)
        }})

        # movies
        user_movies = UserMovie.objects.exclude(status=UserMovie.STATUS_NOT_WATCHED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = MovieStatsSerializer(user_movies, many=True)
        movies = serializer.data
        # movies stats
        watched_movies = UserMovie.objects.filter(user=user, status=UserMovie.STATUS_WATCHED)
        stats.update({'movies': {
            'count': len(watched_movies),
            'total_spent_time':
                round(sum(el.movie.tmdb_runtime for el in watched_movies) / MINUTES_IN_HOUR, 1)
        }})

        # shows
        user_shows = UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED) \
            .filter(user=user) \
            .order_by('-updated_at')
        serializer = ShowStatsSerializer(user_shows, many=True)
        shows = serializer.data
        # shows stats
        watched_episodes = UserEpisode.objects.exclude(score=-1).filter(user=user)
        stats.update({'episodes': {
            'count': len(watched_episodes),
            'total_spent_time':
                round(sum(el.episode.tmdb_show.tmdb_episode_run_time for el in watched_episodes) / MINUTES_IN_HOUR, 1)
        }})

        # followed_users
        followed_users = list(el.followed_user for el
                              in UserFollow.objects.exclude(is_following=False).filter(user=user))
        serializer = UserSerializer(followed_users, many=True)
        followed_users = serializer.data

        return Response({'id': user.id, 'username': user.username, 'is_followed': user_is_followed,
                         'followed_users': followed_users,
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
            serializer = UserFollowSerializer(user_follow, data=data)
        except UserFollow.DoesNotExist:
            serializer = UserFollowSerializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

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
            # email.send()
            print(activation_link)
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

    game_logs = GameLog.objects.filter(user__in=user_query)
    movie_logs = MovieLog.objects.filter(user__in=user_query)
    show_logs = ShowLog.objects.filter(user__in=user_query)
    season_logs = SeasonLog.objects.filter(user__in=user_query)
    episode_logs = EpisodeLog.objects.filter(user__in=user_query)
    user_logs = UserLog.objects.filter(user__in=user_query)

    union_logs = sorted(chain(game_logs, movie_logs, show_logs, season_logs, episode_logs, user_logs),
                        key=lambda obj: obj.created, reverse=True)

    paginator = Paginator(union_logs, page_size)
    paginator_page = paginator.get_page(page)

    results = serialize_logs(paginator_page.object_list)
    return results, paginator_page.has_next()


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
