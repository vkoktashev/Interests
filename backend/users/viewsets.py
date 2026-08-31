from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_simplejwt.views import TokenRefreshView

from users.functions import is_user_available
from users.models import User, UserFollow
from users.selectors import (
    InvalidRandomCountError,
    get_random_entries,
    get_release_calendar,
    get_user_profile_payload,
)
from users.serializers import MyTokenRefreshSerializer, SettingsSerializer, UserSerializer
from users.services.logs import (
    InvalidLogTypeError,
    LogNotFoundError,
    delete_user_log,
    get_logs,
    get_user_by_id,
)
from users.services.tracking import update_follow, update_user_settings
from utils.constants import (
    CANNOT_DELETE_ANOTHER_USER_LOG,
    ERROR,
    ID_VALUE_ERROR,
    LOG_NOT_FOUND,
    TYPE_GAME,
    TYPE_MOVIE,
    TYPE_PERSON,
    TYPE_SHOW,
    TYPE_USER,
    USER_NOT_FOUND,
    WRONG_LOG_TYPE,
)


DEFAULT_LOG_FILTERS = (TYPE_GAME, TYPE_MOVIE, TYPE_SHOW, TYPE_USER, TYPE_PERSON)


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
        user, error_response = _resolve_user(kwargs.get('pk'), request.user)
        if error_response is not None:
            return error_response

        if request.method == 'GET':
            if not is_user_available(request.user, user):
                return Response(status=status.HTTP_403_FORBIDDEN)
            results, count = get_logs(
                (user,),
                request.GET.get('page_size'),
                request.GET.get('page'),
                request.GET.get('query', ''),
                request.query_params.getlist('filters[]', DEFAULT_LOG_FILTERS),
            )
            return Response({'log': results, 'count': count})

        if request.user != user:
            return Response({ERROR: CANNOT_DELETE_ANOTHER_USER_LOG}, status=status.HTTP_403_FORBIDDEN)
        try:
            delete_user_log(user, request.data.get('id'), request.data.get('type'))
        except InvalidLogTypeError:
            return Response({ERROR: WRONG_LOG_TYPE}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
        except LogNotFoundError:
            return Response({ERROR: LOG_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_log(self, request):
        followed_user_ids = UserFollow.objects.filter(
            user=request.user,
            is_following=True,
        ).values('followed_user')
        results, count = get_logs(
            followed_user_ids,
            request.GET.get('page_size'),
            request.GET.get('page'),
            request.GET.get('query', ''),
            request.query_params.getlist('filters[]', DEFAULT_LOG_FILTERS),
        )
        return Response({'log': results, 'count': count})

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def release_calendar(self, request):
        return Response(
            get_release_calendar(request, user=request.user),
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], authentication_classes=[])
    def full_release_calendar(self, request):
        return Response(get_release_calendar(request), status=status.HTTP_200_OK)

    def retrieve(self, request, *args, **kwargs):
        user, error_response = _resolve_user(kwargs.get('pk'), request.user)
        if error_response is not None:
            return error_response
        return Response(get_user_profile_payload(request, user))

    @action(detail=True, methods=['put'])
    def follow(self, request, **kwargs):
        user, error_response = _resolve_user(kwargs.get('pk'), request.user)
        if error_response is not None:
            return error_response
        if not is_user_available(request.user, user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return Response(
            update_follow(request.user, user, request.data),
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def user_settings(self, request):
        if request.method == 'GET':
            return Response(SettingsSerializer(request.user).data, status=status.HTTP_200_OK)
        return Response(
            update_user_settings(request.user, request.data),
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def random(self, request):
        try:
            entries = get_random_entries(
                request,
                request.query_params.getlist('categories[]'),
                request.GET.get('count', 10),
                ended_only=request.GET.get('endedOnly', '') == 'true',
                all_from_db=request.GET.get('allFromDb', '') == 'true',
            )
        except InvalidRandomCountError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        return Response(entries, status=status.HTTP_200_OK)


def _resolve_user(user_id, current_user):
    try:
        return get_user_by_id(user_id, current_user), None
    except ValueError:
        return None, Response({ERROR: ID_VALUE_ERROR}, status=status.HTTP_400_BAD_REQUEST)
    except User.DoesNotExist:
        return None, Response({ERROR: USER_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
