import secrets
import os
import re
from smtplib import SMTPAuthenticationError

from django.core.cache import cache
from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenObtainPairView
import requests

from config import settings
from config.settings import EMAIL_HOST_USER
from users.models import User, UserPasswordToken
from users.serializers import UserSerializer, MyTokenObtainPairSerializer
from users.tokens import account_activation_token
from utils.constants import SITE_URL, ERROR, EMAIL_ERROR, WRONG_URL, USER_NOT_FOUND


class AuthViewSet(GenericViewSet):
    serializer_class = UserSerializer
    GOOGLE_SIGNUP_CACHE_TTL_SECS = 60 * 10

    @staticmethod
    def _normalize_google_email(email):
        return (email or '').strip().lower()

    @staticmethod
    def _build_username_candidates(name, email):
        local_part = (email or '').split('@')[0]
        base_source = (name or '').strip() or local_part or 'user'
        base = re.sub(r'[^a-zA-Z0-9_]+', '_', base_source).strip('_').lower() or 'user'
        base = base[:30]
        return [base, local_part[:30].lower() if local_part else base]

    @classmethod
    def _generate_unique_username(cls, name, email):
        candidates = [x for x in cls._build_username_candidates(name, email) if x]
        checked = set()

        for candidate in candidates:
            if candidate in checked:
                continue
            checked.add(candidate)
            if not User.objects.filter(username__iexact=candidate).exists():
                return candidate

        base = (candidates[0] if candidates else 'user')[:24] or 'user'
        suffix = 1
        while True:
            candidate = f'{base}_{suffix}'
            if not User.objects.filter(username__iexact=candidate).exists():
                return candidate
            suffix += 1

    @staticmethod
    def _build_jwt_response(user):
        refresh = MyTokenObtainPairSerializer.get_token(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username,
            'email': user.email,
        }

    @staticmethod
    def _get_google_profile(id_token):
        google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
        if not google_client_id:
            return None, Response({ERROR: 'Google OAuth не настроен.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            google_response = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': id_token},
                timeout=8,
            )
            google_data = google_response.json()
        except Exception:
            return None, Response({ERROR: 'Google недоступен.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if google_response.status_code != 200:
            return None, Response({ERROR: 'Невалидный Google токен.'}, status=status.HTTP_400_BAD_REQUEST)

        if google_data.get('aud') != google_client_id:
            return None, Response({ERROR: 'Неверный Google client id.'}, status=status.HTTP_400_BAD_REQUEST)

        if google_data.get('email_verified') not in ('true', True):
            return None, Response({ERROR: 'Google email не подтвержден.'}, status=status.HTTP_400_BAD_REQUEST)

        email = AuthViewSet._normalize_google_email(google_data.get('email'))
        sub = (google_data.get('sub') or '').strip()
        if not email:
            return None, Response({ERROR: 'Google не вернул email.'}, status=status.HTTP_400_BAD_REQUEST)
        if not sub:
            return None, Response({ERROR: 'Google не вернул идентификатор аккаунта.'}, status=status.HTTP_400_BAD_REQUEST)

        return {
            'email': email,
            'sub': sub,
            'name': google_data.get('name') or '',
            'raw': google_data,
        }, None

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

        if settings.DEBUG:
            print(activation_link)
            try:
                email.send()
            except SMTPAuthenticationError as e:
                print(e.smtp_error)
                return Response({ERROR: EMAIL_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        else:
            try:
                email.send()
            except SMTPAuthenticationError:
                return Response({ERROR: EMAIL_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @classmethod
    def _google_signup_cache_key(cls, signup_token):
        return f'google_signup_pending_{signup_token}'

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google_login(self, request):
        id_token = request.data.get('id_token') or request.data.get('credential')
        if not id_token:
            return Response({ERROR: 'Не передан Google токен.'}, status=status.HTTP_400_BAD_REQUEST)

        google_profile, error_response = self._get_google_profile(id_token)
        if error_response:
            return error_response

        email = google_profile['email']
        google_sub = google_profile['sub']

        user = User.objects.filter(google_sub=google_sub).first()
        if user is None:
            user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return Response(
                {ERROR: 'Аккаунт не найден. Используйте регистрацию через Google, чтобы выбрать никнейм.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        update_fields = []
        if user.google_sub != google_sub:
            user.google_sub = google_sub
            update_fields.append('google_sub')
        if user.google_email != email:
            user.google_email = email
            update_fields.append('google_email')
        if not user.is_active:
            user.is_active = True
            update_fields.append('is_active')
        if update_fields:
            user.save(update_fields=tuple(update_fields))

        return Response(self._build_jwt_response(user), status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google_signup_prepare(self, request):
        id_token = request.data.get('id_token') or request.data.get('credential')
        if not id_token:
            return Response({ERROR: 'Не передан Google токен.'}, status=status.HTTP_400_BAD_REQUEST)

        google_profile, error_response = self._get_google_profile(id_token)
        if error_response:
            return error_response

        email = google_profile['email']
        google_sub = google_profile['sub']

        if User.objects.filter(google_sub=google_sub).exists() or User.objects.filter(email__iexact=email).exists():
            return Response(
                {ERROR: 'Аккаунт с таким Google/email уже существует. Используйте вход через Google.'},
                status=status.HTTP_409_CONFLICT,
            )

        suggested_username = self._generate_unique_username(google_profile.get('name'), email)
        signup_token = secrets.token_urlsafe()
        cache.set(
            self._google_signup_cache_key(signup_token),
            {
                'email': email,
                'sub': google_sub,
                'name': google_profile.get('name') or '',
            },
            timeout=self.GOOGLE_SIGNUP_CACHE_TTL_SECS,
        )

        return Response({
            'signup_token': signup_token,
            'suggested_username': suggested_username,
            'email': email,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google_signup_complete(self, request):
        signup_token = (request.data.get('signup_token') or '').strip()
        username = (request.data.get('username') or '').strip()

        if not signup_token or not username:
            return Response({ERROR: 'Не переданы обязательные данные.'}, status=status.HTTP_400_BAD_REQUEST)

        pending_data = cache.get(self._google_signup_cache_key(signup_token))
        if not pending_data:
            return Response({ERROR: 'Сессия регистрации через Google истекла. Повторите попытку.'},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = UserSerializer(data={
            'username': username,
            'email': pending_data['email'],
            # Temporary value only for serializer validation; will be replaced by unusable password.
            'password': secrets.token_urlsafe(16),
        })
        serializer.is_valid(raise_exception=True)

        user = User.objects.create(
            username=username,
            email=pending_data['email'],
            is_active=True,
            google_sub=pending_data['sub'],
            google_email=pending_data['email'],
        )
        user.set_unusable_password()
        user.save(update_fields=('password',))

        cache.delete(self._google_signup_cache_key(signup_token))
        return Response(self._build_jwt_response(user), status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def google_link_status(self, request):
        return Response({
            'is_linked': bool(request.user.google_sub),
            'google_email': request.user.google_email,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def google_link(self, request):
        id_token = request.data.get('id_token') or request.data.get('credential')
        if not id_token:
            return Response({ERROR: 'Не передан Google токен.'}, status=status.HTTP_400_BAD_REQUEST)

        google_profile, error_response = self._get_google_profile(id_token)
        if error_response:
            return error_response

        google_sub = google_profile['sub']
        google_email = google_profile['email']

        conflict_user = User.objects.filter(google_sub=google_sub).exclude(id=request.user.id).first()
        if conflict_user is not None:
            return Response({ERROR: 'Этот Google аккаунт уже привязан к другому пользователю.'},
                            status=status.HTTP_409_CONFLICT)

        update_fields = []
        if request.user.google_sub != google_sub:
            request.user.google_sub = google_sub
            update_fields.append('google_sub')
        if request.user.google_email != google_email:
            request.user.google_email = google_email
            update_fields.append('google_email')

        if update_fields:
            request.user.save(update_fields=tuple(update_fields))

        return Response({
            'is_linked': True,
            'google_email': request.user.google_email,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['delete'], permission_classes=[IsAuthenticated])
    def google_unlink(self, request):
        request.user.google_sub = None
        request.user.google_email = None
        request.user.save(update_fields=('google_sub', 'google_email'))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirm_email(self, request):
        uid64 = request.query_params.get('uid64') or request.data.get('uid64')
        token = request.query_params.get('token') or request.data.get('token')

        try:
            uid = force_str(urlsafe_base64_decode(uid64))
            user = User.objects.get(pk=uid)
        except(TypeError, ValueError, OverflowError, AttributeError, User.DoesNotExist):
            user = None

        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            serializer = UserSerializer(instance=user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response({ERROR: WRONG_URL}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['put'], permission_classes=[AllowAny])
    def password_reset(self, request):
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
        if settings.DEBUG:
            print(activation_link)
            try:
                email.send()
            except SMTPAuthenticationError as e:
                print(e.smtp_error)
                return Response({ERROR: EMAIL_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        else:
            try:
                email.send()
            except SMTPAuthenticationError:
                return Response({ERROR: EMAIL_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['patch'], permission_classes=[AllowAny])
    def confirm_password_reset(self, request):
        try:
            reset_token = force_str(urlsafe_base64_decode(request.query_params.get('reset_token')))
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


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
