import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenObtainPairView

from users.models import User
from users.serializers import MyTokenObtainPairSerializer, UserSerializer
from users.services.auth import (
    AuthServiceError,
    complete_google_signup,
    confirm_email,
    confirm_password_reset,
    get_google_link_status,
    google_login,
    link_google_account,
    prepare_google_signup,
    request_password_reset,
    signup,
    unlink_google_account,
)
from users.services.telegram import (
    TelegramLinkError,
    create_telegram_link,
    get_telegram_link_status,
    handle_update,
    is_valid_webhook_secret,
    unlink_telegram_account,
)
from utils.constants import ERROR

logger = logging.getLogger(__name__)


class AuthViewSet(GenericViewSet):
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def signup(self, request):
        return _service_response(
            signup,
            request.data,
            success_status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google_login(self, request):
        return _service_response(google_login, _get_google_token(request))

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google_signup_prepare(self, request):
        return _service_response(prepare_google_signup, _get_google_token(request))

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google_signup_complete(self, request):
        return _service_response(
            complete_google_signup,
            request.data.get('signup_token'),
            request.data.get('username'),
            request.data.get('gender') or User.GENDER_MALE,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def google_link_status(self, request):
        return Response(get_google_link_status(request.user), status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def google_link(self, request):
        return _service_response(
            link_google_account,
            request.user,
            _get_google_token(request),
        )

    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def google_unlink(self, request):
        unlink_google_account(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def telegram_link_status(self, request):
        return Response(get_telegram_link_status(request.user), status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def telegram_link(self, request):
        try:
            data = create_telegram_link(request.user)
        except TelegramLinkError as error:
            return Response({ERROR: str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def telegram_unlink(self, request):
        unlink_telegram_account(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirm_email(self, request):
        return _service_response(
            confirm_email,
            request.query_params.get('uid64') or request.data.get('uid64'),
            request.query_params.get('token') or request.data.get('token'),
        )

    @action(detail=False, methods=['put'], permission_classes=[AllowAny])
    def password_reset(self, request):
        response = _service_response(
            request_password_reset,
            request.data.get('email'),
        )
        if response.status_code == status.HTTP_200_OK:
            return Response(status=status.HTTP_200_OK)
        return response

    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirm_password_reset(self, request):
        return _service_response(
            confirm_password_reset,
            request.query_params.get('reset_token'),
            request.data.get('password'),
        )


class TelegramWebhookView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)
    swagger_schema = None

    def post(self, request):
        if not is_valid_webhook_secret(request.headers.get('X-Telegram-Bot-Api-Secret-Token')):
            return Response(status=status.HTTP_403_FORBIDDEN)
        if isinstance(request.data, dict):
            # Answer 200 even on failure, otherwise Telegram keeps redelivering the same update.
            try:
                handle_update(request.data)
            except Exception:
                logger.exception('telegram webhook: failed to handle update')
        return Response(status=status.HTTP_200_OK)


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


def _get_google_token(request):
    return request.data.get('id_token') or request.data.get('credential')


def _service_response(service, *args, success_status=status.HTTP_200_OK):
    try:
        data = service(*args)
    except AuthServiceError as error:
        return Response({ERROR: error.message}, status=error.status_code)
    return Response(data, status=success_status)
