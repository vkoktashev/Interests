import tmdbsimple as tmdb
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response

tmdb.API_KEY = 'ebf9e8e8a2be6bba6aacfa5c4c76f698'
LANGUAGE = 'ru'

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


@swagger_auto_schema(method='GET', manual_parameters=[query_param, page_param])
@api_view(['GET'])
def search(request):
    query = request.GET.get('query', '')
    page = request.GET.get('page', 1)
    results = tmdb.Search().movie(query=query, page=page, language=LANGUAGE)
    return Response(results)
