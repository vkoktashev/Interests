from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from people.selectors import get_people_search_payload
from people.services.search import search_people
from utils.constants import DEFAULT_PAGE_NUMBER
from utils.swagger import openapi, swagger_auto_schema


class SearchPeopleViewSet(GenericViewSet):
    @swagger_auto_schema(
        operation_description='Search for people using the TMDB API.',
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
        ],
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('TMDB unavailable'),
        },
    )
    @action(detail=False, methods=['get'])
    def tmdb(self, request, *args, **kwargs):
        people, total_results = search_people(
            query=request.GET.get('query', '').strip(),
            page=request.GET.get('page', DEFAULT_PAGE_NUMBER),
        )
        payload = get_people_search_payload(people, total_results, request)
        return Response(payload, status=status.HTTP_200_OK)
