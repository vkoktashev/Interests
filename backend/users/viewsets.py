from django.core.mail import EmailMessage
from django.core.paginator import Paginator, EmptyPage
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
from games.models import GameLog, UserGame
from games.serializers import UserGameRawgSerializer
from users.serializers import UserSerializer, MyTokenObtainPairSerializer
from .models import User
from .tokens import account_activation_token

TYPE_GAME = 'game'

uid64_param = openapi.Parameter('uid64', openapi.IN_QUERY, description="Зашифрованный первичный ключ пользователя",
                                type=openapi.TYPE_STRING)
token_param = openapi.Parameter('token', openapi.IN_QUERY, description="Специальный токен для подтверждения",
                                type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


class AuthViewSet(GenericViewSet):
    @swagger_auto_schema(request_body=UserSerializer)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def signup(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        mail_subject = 'Activate your account.'
        confirmation_url = 'http://127.0.0.1:8000/users/auth/confirmation/'  # get_current_site(request)
        uid64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        activation_link = f"{confirmation_url}?uid64={uid64}&token={token}"
        message = f"Hello {user.username},\n {activation_link}"
        email = EmailMessage(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
        # email.send()
        print(activation_link)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(manual_parameters=[uid64_param, token_param])
    @action(detail=False, methods=['get'])
    def confirmation(self, request):
        try:
            uid = force_text(urlsafe_base64_decode(request.query_params.get('uid64')))
            user = User.objects.get(pk=uid)
        except(TypeError, ValueError, OverflowError, AttributeError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, request.query_params.get('token')):
            user.is_active = True
            user.save()
            return Response(status=status.HTTP_200_OK)
        else:
            return Response('Confirmation link is invalid!', status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    @swagger_auto_schema(manual_parameters=[page_param])
    @action(detail=False, methods=['get'])
    def get_log(self, request):
        try:
            page = int(request.GET.get('page'))
        except (ValueError, TypeError):
            page = 1
        page_size = 10
        logs = GameLog.objects.filter(user=request.user).order_by('-created')
        paginator = Paginator(logs, page_size)

        log_dicts = []
        try:
            paginator_page = paginator.page(page)
        except EmptyPage:
            return Response('Wrong page number', status=status.HTTP_400_BAD_REQUEST)

        for log in paginator.page(page):
            log_dict = {'user': log.user.username,
                        'user_id': log.user.id,
                        'target': log.game.rawg_name,
                        'target_id': log.game.rawg_slug,
                        'created': log.created,
                        'type': TYPE_GAME,
                        'action_type': log.action_type,
                        'action_result': log.action_result,
                        }
            log_dicts.append(log_dict)

        return Response({'log': log_dicts,
                         'has_next_page': paginator_page.has_next()})

    def retrieve(self, request, *args, **kwargs):
        try:
            user = User.objects.get(id=kwargs.get('pk'))
        except User.DoesNotExist:
            return Response('Wrong id', status=status.HTTP_400_BAD_REQUEST)

        try:
            user_games = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).filter(user=user)
            serializer = UserGameRawgSerializer(user_games, many=True)
            games = serializer.data
        except UserGame.DoesNotExist:
            games = None

        return Response({'username': user.username, 'games': games})


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
