from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import UntypedToken


class InvalidBearerTokenError(Exception):
    pass


def resolve_user_from_bearer(authorization_header):
    if not authorization_header.startswith('Bearer '):
        return None

    token = authorization_header.split(' ', 1)[1].strip()
    if not token:
        return None

    try:
        payload = UntypedToken(token)
    except TokenError as error:
        raise InvalidBearerTokenError from error

    user_id = payload.get('user_id')
    if not user_id:
        raise InvalidBearerTokenError

    user = get_user_model().objects.filter(id=user_id).first()
    if user is None:
        raise InvalidBearerTokenError
    return user
