from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.services.user_stats import (
    InvalidPersonalityTypeError,
    get_top_personalities,
    get_user_stats,
)
from users.functions import is_user_available
from users.models import User
from utils.constants import ERROR, ID_VALUE_ERROR, USER_NOT_FOUND


class UserAnalyticsView(APIView):
    def get(self, request, user_id):
        user, error_response = _resolve_user(user_id, request.user)
        if error_response is not None:
            return error_response
        if not is_user_available(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        return Response(
            get_user_stats(user, request.query_params.get('tz')),
            status=status.HTTP_200_OK,
        )


class TopPersonalitiesView(APIView):
    def get(self, request, user_id):
        user, error_response = _resolve_user(user_id, request.user)
        if error_response is not None:
            return error_response
        if not is_user_available(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        try:
            results = get_top_personalities(user, request.query_params.get('type'))
        except InvalidPersonalityTypeError:
            return Response(
                {ERROR: 'Type must be one of: actors, directors, studios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'results': results}, status=status.HTTP_200_OK)


def _resolve_user(user_id, current_user):
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None, Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)

    if current_user.pk == user_id:
        return current_user, None

    try:
        return User.objects.get(pk=user_id), None
    except User.DoesNotExist:
        return None, Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

