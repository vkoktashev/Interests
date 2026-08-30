import os
import re
import secrets
from smtplib import SMTPAuthenticationError

import requests
from django.core.cache import cache
from django.core.mail import EmailMessage
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status

from config import settings
from config.settings import EMAIL_HOST_USER
from users.models import User, UserPasswordToken
from users.serializers import MyTokenObtainPairSerializer, UserSerializer
from users.tokens import account_activation_token
from utils.constants import EMAIL_ERROR, SITE_URL, USER_NOT_FOUND, WRONG_URL


GOOGLE_SIGNUP_CACHE_TTL_SECS = 60 * 10


class AuthServiceError(Exception):
    def __init__(self, message, status_code):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def signup(data, request_scheme):
    serializer = UserSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    uid64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = account_activation_token.make_token(user)
    activation_link = f'{request_scheme}://{SITE_URL}/confirm/?uid64={uid64}&token={token}'
    _send_email(
        'Активация аккаунта.',
        f'Привет {user.username}, для активации аккаунта '
        f'перейди по ссылке:\n{activation_link}',
        user.email,
        activation_link,
    )
    return serializer.data


def google_login(id_token):
    profile = _get_google_profile(id_token)
    user = User.objects.filter(google_sub=profile['sub']).first()
    if user is None:
        user = User.objects.filter(email__iexact=profile['email']).first()
    if user is None:
        raise AuthServiceError(
            'Аккаунт не найден. Используйте регистрацию через Google, '
            'чтобы выбрать никнейм.',
            status.HTTP_404_NOT_FOUND,
        )

    update_fields = []
    for field, value in (
        ('google_sub', profile['sub']),
        ('google_email', profile['email']),
        ('is_active', True),
    ):
        if getattr(user, field) != value:
            setattr(user, field, value)
            update_fields.append(field)
    if update_fields:
        user.save(update_fields=tuple(update_fields))
    return _build_jwt_response(user)


def prepare_google_signup(id_token):
    profile = _get_google_profile(id_token)
    if User.objects.filter(google_sub=profile['sub']).exists() \
            or User.objects.filter(email__iexact=profile['email']).exists():
        raise AuthServiceError(
            'Аккаунт с таким Google/email уже существует. '
            'Используйте вход через Google.',
            status.HTTP_409_CONFLICT,
        )

    signup_token = secrets.token_urlsafe()
    cache.set(
        _google_signup_cache_key(signup_token),
        {
            'email': profile['email'],
            'sub': profile['sub'],
            'name': profile.get('name') or '',
        },
        timeout=GOOGLE_SIGNUP_CACHE_TTL_SECS,
    )
    return {
        'signup_token': signup_token,
        'suggested_username': _generate_unique_username(profile.get('name'), profile['email']),
        'email': profile['email'],
    }


@transaction.atomic
def complete_google_signup(signup_token, username, gender):
    signup_token = (signup_token or '').strip()
    username = (username or '').strip()
    gender = (gender or User.GENDER_MALE).strip()
    if not signup_token or not username:
        raise AuthServiceError(
            'Не переданы обязательные данные.',
            status.HTTP_400_BAD_REQUEST,
        )

    pending = cache.get(_google_signup_cache_key(signup_token))
    if not pending:
        raise AuthServiceError(
            'Сессия регистрации через Google истекла. Повторите попытку.',
            status.HTTP_400_BAD_REQUEST,
        )
    serializer = UserSerializer(data={
        'username': username,
        'email': pending['email'],
        'gender': gender,
        'password': secrets.token_urlsafe(16),
    })
    serializer.is_valid(raise_exception=True)
    user = User.objects.create(
        username=username,
        email=pending['email'],
        gender=gender,
        is_active=True,
        google_sub=pending['sub'],
        google_email=pending['email'],
    )
    user.set_unusable_password()
    user.save(update_fields=('password',))
    transaction.on_commit(lambda: cache.delete(_google_signup_cache_key(signup_token)))
    return _build_jwt_response(user)


def get_google_link_status(user):
    return {'is_linked': bool(user.google_sub), 'google_email': user.google_email}


def link_google_account(user, id_token):
    profile = _get_google_profile(id_token)
    conflict = User.objects.filter(google_sub=profile['sub']).exclude(id=user.id).first()
    if conflict is not None:
        raise AuthServiceError(
            'Этот Google аккаунт уже привязан к другому пользователю.',
            status.HTTP_409_CONFLICT,
        )

    update_fields = []
    for field, value in (('google_sub', profile['sub']), ('google_email', profile['email'])):
        if getattr(user, field) != value:
            setattr(user, field, value)
            update_fields.append(field)
    if update_fields:
        user.save(update_fields=tuple(update_fields))
    return {'is_linked': True, 'google_email': user.google_email}


def unlink_google_account(user):
    user.google_sub = None
    user.google_email = None
    user.save(update_fields=('google_sub', 'google_email'))


def confirm_email(uid64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uid64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, AttributeError, User.DoesNotExist) as error:
        raise AuthServiceError(WRONG_URL, status.HTTP_400_BAD_REQUEST) from error
    if not account_activation_token.check_token(user, token):
        raise AuthServiceError(WRONG_URL, status.HTTP_400_BAD_REQUEST)
    user.is_active = True
    user.save()
    return UserSerializer(instance=user).data


def request_password_reset(email, request_scheme):
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist as error:
        raise AuthServiceError(USER_NOT_FOUND, status.HTTP_404_NOT_FOUND) from error

    reset_token = secrets.token_urlsafe()
    password_token, _ = UserPasswordToken.objects.get_or_create(
        user=user,
        defaults={'reset_token': reset_token},
    )
    password_token.reset_token = reset_token
    password_token.is_active = True
    password_token.save()
    link = f'{request_scheme}://{SITE_URL}/confirm_password/?token=' \
           f'{urlsafe_base64_encode(force_bytes(reset_token))}'
    _send_email(
        'Сброс пароля.',
        f'Привет {user.username}, вот твоя ссылка:\n{link}',
        user.email,
        link,
    )


@transaction.atomic
def confirm_password_reset(reset_token, password):
    try:
        decoded_token = force_str(urlsafe_base64_decode(reset_token))
        password_token = UserPasswordToken.objects.get(reset_token=decoded_token)
        user = User.objects.get(id=password_token.user.id)
    except (
        TypeError,
        ValueError,
        OverflowError,
        AttributeError,
        User.DoesNotExist,
        UserPasswordToken.DoesNotExist,
    ) as error:
        raise AuthServiceError(WRONG_URL, status.HTTP_400_BAD_REQUEST) from error
    if not password_token.is_active:
        raise AuthServiceError(WRONG_URL, status.HTTP_400_BAD_REQUEST)

    serializer = UserSerializer(instance=user, data={'password': password}, partial=True)
    serializer.is_valid(raise_exception=True)
    password_token.is_active = False
    password_token.save()
    serializer.save()
    return serializer.data


def _get_google_profile(id_token):
    if not id_token:
        raise AuthServiceError('Не передан Google токен.', status.HTTP_400_BAD_REQUEST)
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    if not client_id:
        raise AuthServiceError('Google OAuth не настроен.', status.HTTP_503_SERVICE_UNAVAILABLE)
    try:
        response = requests.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'id_token': id_token},
            timeout=8,
        )
        data = response.json()
    except Exception as error:
        raise AuthServiceError('Google недоступен.', status.HTTP_503_SERVICE_UNAVAILABLE) from error
    if response.status_code != 200:
        raise AuthServiceError('Невалидный Google токен.', status.HTTP_400_BAD_REQUEST)
    if data.get('aud') != client_id:
        raise AuthServiceError('Неверный Google client id.', status.HTTP_400_BAD_REQUEST)
    if data.get('email_verified') not in ('true', True):
        raise AuthServiceError('Google email не подтвержден.', status.HTTP_400_BAD_REQUEST)

    email = (data.get('email') or '').strip().lower()
    google_sub = (data.get('sub') or '').strip()
    if not email:
        raise AuthServiceError('Google не вернул email.', status.HTTP_400_BAD_REQUEST)
    if not google_sub:
        raise AuthServiceError(
            'Google не вернул идентификатор аккаунта.',
            status.HTTP_400_BAD_REQUEST,
        )
    return {'email': email, 'sub': google_sub, 'name': data.get('name') or '', 'raw': data}


def _generate_unique_username(name, email):
    local_part = (email or '').split('@')[0]
    base_source = (name or '').strip() or local_part or 'user'
    base = re.sub(r'[^a-zA-Z0-9_]+', '_', base_source).strip('_').lower() or 'user'
    candidates = [base[:30], local_part[:30].lower() if local_part else base[:30]]
    checked = set()
    for candidate in candidates:
        if not candidate or candidate in checked:
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


def _build_jwt_response(user):
    refresh = MyTokenObtainPairSerializer.get_token(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'username': user.username,
        'email': user.email,
        'gender': user.gender,
    }


def _google_signup_cache_key(signup_token):
    return f'google_signup_pending_{signup_token}'


def _send_email(subject, message, recipient, debug_link):
    email = EmailMessage(subject, message, to=[recipient], from_email=EMAIL_HOST_USER)
    if settings.DEBUG:
        print(debug_link)
    try:
        email.send()
    except SMTPAuthenticationError as error:
        if settings.DEBUG:
            print(error.smtp_error)
        raise AuthServiceError(EMAIL_ERROR, status.HTTP_503_SERVICE_UNAVAILABLE) from error
