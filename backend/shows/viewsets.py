import tmdbsimple as tmdb
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError
from rest_framework import status, mixins
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from shows.models import UserShow, Show, UserSeason, Season, UserEpisode, Episode
from shows.serializers import UserShowSerializer, UserSeasonSerializer, UserEpisodeSerializer
from utils.constants import ERROR, LANGUAGE, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, DEFAULT_PAGE_NUMBER, EPISODE_NOT_FOUND, \
    SEASON_NOT_FOUND
from utils.documentation import SHOW_RETRIEVE_200_EXAMPLE, SHOWS_SEARCH_200_EXAMPLE, EPISODE_RETRIEVE_200_EXAMPLE, \
    SEASON_RETRIEVE_200_EXAMPLE
from utils.openapi_params import query_param, page_param


class SearchShowsViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param, page_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": SHOWS_SEARCH_200_EXAMPLE
                                 }

                             )
                         })
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        try:
            results = tmdb.Search().tv(query=query, page=page, language=LANGUAGE)
        except HTTPError:
            results = None
        return Response(results, status=status.HTTP_200_OK)


class ShowViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserShow.objects.all()
    serializer_class = UserShowSerializer
    lookup_field = 'tmdb_id'

    @swagger_auto_schema(responses={
        status.HTTP_200_OK: openapi.Response(
            description=status.HTTP_200_OK,
            examples={
                "application/json": SHOW_RETRIEVE_200_EXAMPLE
            }
        ),
        status.HTTP_404_NOT_FOUND: openapi.Response(
            description=status.HTTP_404_NOT_FOUND,
            examples={
                "application/json": {
                    ERROR: SHOW_NOT_FOUND
                }
            }
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
            description=status.HTTP_503_SERVICE_UNAVAILABLE,
            examples={
                "application/json": {
                    ERROR: TMDB_UNAVAILABLE
                },
            }
        )
    })
    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_show = tmdb.TV(kwargs.get('tmdb_id')).info(language=LANGUAGE)
            # for season in tmdb_show.get('seasons'):
            #     tmdb_season = tmdb.TV_Seasons(kwargs.get('tmdb_id'), season.get('season_number')).info()
            #     season.update({'episodes': tmdb_season.get('episodes')})
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            show = Show.objects.get(tmdb_id=tmdb_show['id'])
            user_show = UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED).get(user=request.user,
                                                                                         show=show)
            user_info = self.get_serializer(user_show).data
        except (Show.DoesNotExist, UserShow.DoesNotExist):
            user_info = None

        return Response({'tmdb': tmdb_show, 'user_info': user_info})


class SeasonViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserSeason.objects.all()
    serializer_class = UserSeasonSerializer
    lookup_field = 'number'

    @swagger_auto_schema(responses={
        status.HTTP_200_OK: openapi.Response(
            description=status.HTTP_200_OK,
            examples={
                "application/json": SEASON_RETRIEVE_200_EXAMPLE
            }
        ),
        status.HTTP_404_NOT_FOUND: openapi.Response(
            description=status.HTTP_404_NOT_FOUND,
            examples={
                "application/json": {
                    ERROR: SEASON_NOT_FOUND
                }
            }
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
            description=status.HTTP_503_SERVICE_UNAVAILABLE,
            examples={
                "application/json": {
                    ERROR: TMDB_UNAVAILABLE
                },
            }
        )
    })
    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_season = tmdb.TV_Seasons(kwargs.get('show_tmdb_id'), kwargs.get('number')).info(
                language=LANGUAGE)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SEASON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            season = Season.objects.get(tmdb_id=tmdb_season.get('id'))
            user_season = UserSeason.objects.get(user=request.user, season=season)
            user_info = self.get_serializer(user_season).data
        except (Season.DoesNotExist, UserSeason.DoesNotExist):
            user_info = None

        return Response({'tmdb': tmdb_season, 'user_info': user_info})


class EpisodeViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserEpisode.objects.all()
    serializer_class = UserEpisodeSerializer
    lookup_field = 'number'

    @swagger_auto_schema(responses={
        status.HTTP_200_OK: openapi.Response(
            description=status.HTTP_200_OK,
            examples={
                "application/json": EPISODE_RETRIEVE_200_EXAMPLE
            }
        ),
        status.HTTP_404_NOT_FOUND: openapi.Response(
            description=status.HTTP_404_NOT_FOUND,
            examples={
                "application/json": {
                    ERROR: EPISODE_NOT_FOUND
                }
            }
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
            description=status.HTTP_503_SERVICE_UNAVAILABLE,
            examples={
                "application/json": {
                    ERROR: TMDB_UNAVAILABLE
                },
            }
        )
    })
    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_episode = tmdb.TV_Episodes(kwargs.get('show_tmdb_id'), kwargs.get('season_number'),
                                            kwargs.get('number')).info(language=LANGUAGE)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            episode = Episode.objects.get(tmdb_id=tmdb_episode.get('id'))
            user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
            user_info = self.get_serializer(user_episode).data
        except (Episode.DoesNotExist, UserEpisode.DoesNotExist):
            user_info = None

        return Response({'tmdb': tmdb_episode, 'user_info': user_info})
