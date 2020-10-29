import tmdbsimple as tmdb
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import Movie, UserMovie
from movies.serializers import UserMovieSerializer

tmdb.API_KEY = 'ebf9e8e8a2be6bba6aacfa5c4c76f698'
LANGUAGE = 'ru'

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


class SearchMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param, page_param])
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', 1)
        results = tmdb.Search().movie(query=query, page=page, language=LANGUAGE)
        return Response(results)


class MovieViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_movie = tmdb.Movies(kwargs.get('pk')).info(language=LANGUAGE)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({"Movie not found, check your id"}, status=status.HTTP_404_NOT_FOUND)
            return Response({"Something went wrong"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            movie = Movie.objects.get(tmdb_id=tmdb_movie['id'])
            user_movie = UserMovie.objects.exclude(status=UserMovie.STATUS_NOT_WATCHED).get(user=request.user,
                                                                                            movie=movie)
            user_info = UserMovieSerializer(user_movie).data
        except (Movie.DoesNotExist, UserMovie.DoesNotExist):
            user_info = None

        return Response({'tmdb': tmdb_movie, 'user_info': user_info})
