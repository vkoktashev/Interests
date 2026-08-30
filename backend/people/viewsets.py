from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from people.models import Person
from people.selectors import get_person_payload
from people.services.catalog import (
    PersonNotFoundError as CatalogPersonNotFoundError,
    TmdbUnavailableError,
    enqueue_person_refresh,
    get_person_by_id,
    get_person_by_tmdb_id,
    person_refresh_is_due,
)
from people.services.tracking import (
    InvalidTrackingValueError,
    PersonNotFoundError as TrackingPersonNotFoundError,
    set_person_tracking,
)
from utils.constants import ERROR, PERSON_NOT_FOUND, TMDB_UNAVAILABLE
from utils.swagger import openapi, swagger_auto_schema


class PersonViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Person.objects.all()
    lookup_value_regex = r'\d+'

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('pk', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Person not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return self._get_person_response(
            request,
            get_person_by_id,
            kwargs.get('pk'),
        )

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Person not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=False, methods=['get'], url_path=r'tmdb/(?P<tmdb_id>\d+)')
    def tmdb(self, request, tmdb_id=None):
        return self._get_person_response(request, get_person_by_tmdb_id, tmdb_id)

    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated])
    def track(self, request, *args, **kwargs):
        try:
            is_tracked = set_person_tracking(
                request.user,
                kwargs.get('pk'),
                request.data.get('is_tracked'),
            )
        except TrackingPersonNotFoundError:
            return Response({ERROR: PERSON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except InvalidTrackingValueError:
            return Response(
                {ERROR: 'Поле is_tracked должно быть логическим значением.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'is_tracked': is_tracked}, status=status.HTTP_200_OK)

    @staticmethod
    def _get_person_response(request, loader, person_id):
        try:
            person = loader(person_id)
        except CatalogPersonNotFoundError:
            return Response({ERROR: PERSON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        response = Response(get_person_payload(person, request))
        if person_refresh_is_due(person):
            tmdb_id = person.tmdb_id
            response.add_post_render_callback(lambda _: enqueue_person_refresh(tmdb_id))
        return response
