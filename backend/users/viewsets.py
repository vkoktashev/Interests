from django.core.mail import EmailMessage
from django.template.defaultfilters import lower
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenObtainPairView

from config.settings import EMAIL_HOST_USER
from games.models import UserGame
from games.serializers import ExtendedUserGameSerializer
from movies.models import UserMovie
from movies.serializers import ExtendedUserMovieSerializer
from users.serializers import UserSerializer, MyTokenObtainPairSerializer, UserFollowSerializer
from utils.functions import similar
from .models import User, UserFollow
from .tokens import account_activation_token

TYPE_GAME = 'game'
SITE_URL = 'localhost:3000'
MINUTES_IN_HOUR = 60

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


class AuthViewSet(GenericViewSet):
    @swagger_auto_schema(request_body=UserSerializer)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def signup(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        mail_subject = 'Активация аккаунта.'
        uid64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        activation_link = f"{request.scheme}://{SITE_URL}/confirm/?uid64={uid64}&token={token}"
        message = f"Привет {user.username}, вот твоя ссылка:\n{activation_link}"
        email = EmailMessage(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
        # email.send()
        print(activation_link)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'uid64': openapi.Schema(type=openapi.TYPE_STRING, description='Зашифрованный первичный ключ пользователя'),
            'token': openapi.Schema(type=openapi.TYPE_STRING, description='Специальный токен для подтверждения'),
        }
    ))
    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirmation(self, request):
        try:
            uid = force_text(urlsafe_base64_decode(request.data.get('uid64')))
            user = User.objects.get(pk=uid)
        except(TypeError, ValueError, OverflowError, AttributeError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, request.data.get('token')):
            user.is_active = True
            user.save()
            return Response(status=status.HTTP_200_OK)
        else:
            return Response("Неверная ссылка!", status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    # @swagger_auto_schema(manual_parameters=[page_param])
    # @action(detail=True, methods=['get'])
    # def get_log(self, request, *args, **kwargs):
    #     try:
    #         page = int(request.GET.get('page'))
    #     except (ValueError, TypeError):
    #         page = 1
    #     page_size = 10
    #     logs = GameLog.objects.filter(user=request.user).order_by('-created')
    #     paginator = Paginator(logs, page_size)
    #
    #     log_dicts = []
    #     try:
    #         paginator_page = paginator.page(page)
    #     except EmptyPage:
    #         return Response('Wrong page number', status=status.HTTP_400_BAD_REQUEST)
    #
    #     for log in paginator.page(page):
    #         log_dict = {'user': log.user.username,
    #                     'user_id': log.user.id,
    #                     'target': log.game.rawg_name,
    #                     'target_id': log.game.rawg_slug,
    #                     'created': log.created,
    #                     'type': TYPE_GAME,
    #                     'action_type': log.action_type,
    #                     'action_result': log.action_result,
    #                     }
    #         log_dicts.append(log_dict)
    #
    #     return Response({'log': log_dicts,
    #                      'has_next_page': paginator_page.has_next()})

    def retrieve(self, request, *args, **kwargs):
        try:
            user_id = int(kwargs.get('pk'))
        except ValueError:
            return Response('Wrong id, must be integer', status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response('User does not exist', status=status.HTTP_400_BAD_REQUEST)

        stats = {}

        # games
        user_games = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .filter(user=user) \
            .order_by('updated_at')
        serializer = ExtendedUserGameSerializer(user_games, many=True)
        games = serializer.data
        stats.update({'games_count': len(user_games),
                      'games_total_spent_time': sum(el.spent_time for el in user_games)})

        # movies
        user_movies = UserMovie.objects \
            .filter(user=user, status=UserMovie.STATUS_WATCHED) \
            .order_by('updated_at')
        serializer = ExtendedUserMovieSerializer(user_movies, many=True)
        movies = serializer.data
        stats.update({'movies_count': len(user_movies),
                      'movies_total_spent_time':
                          round(sum(el.movie.tmdb_runtime for el in user_movies) / MINUTES_IN_HOUR, 1)})

        # followed_users
        followed_users = list(el.followed_user for el
                              in UserFollow.objects.exclude(is_following=False).filter(user=user))
        serializer = UserSerializer(followed_users, many=True)
        followed_users = serializer.data

        return Response({'username': user.username, 'followed_users': followed_users,
                         'games': games, 'movies': movies, 'stats': stats})

    @action(detail=True, methods=['put'])
    @swagger_auto_schema(request_body=UserFollowSerializer)
    def follow(self, request, *args, **kwargs):
        try:
            user_id = int(kwargs.get('pk'))
        except ValueError:
            return Response('Wrong id, must be integer', status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        data.update({'user': request.user.pk, 'followed_user': user_id})

        try:
            user_follow = UserFollow.objects.get(user=request.user, followed_user=user_id)
            serializer = UserFollowSerializer(user_follow, data=data)
            created = False
        except UserFollow.DoesNotExist:
            serializer = UserFollowSerializer(data=data)
            created = True

        serializer.is_valid(raise_exception=True)
        serializer.save()

        if created:
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.data, status=status.HTTP_200_OK)


class SearchUsersViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param])
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        results = []
        for user in User.objects.all():
            similarity = similar(lower(query), lower(user.username))  # similarity is 0.0-1.0
            if similarity > 0.4:
                user.similarity = similarity
                results.append(user)
                print(user.username, similarity)
        results.sort(key=lambda u: u.similarity, reverse=True)
        serializer = UserSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
