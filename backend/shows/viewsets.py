import tmdbsimple as tmdb
from django.core.paginator import Paginator
from django.db import IntegrityError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from shows.models import UserShow, Show, UserSeason, Season, UserEpisode, Episode
from shows.serializers import UserShowSerializer, UserSeasonSerializer, UserEpisodeSerializer, \
    FollowedUserShowSerializer, FollowedUserSeasonSerializer, FollowedUserEpisodeSerializer
from users.models import UserFollow
from utils.constants import ERROR, LANGUAGE, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, DEFAULT_PAGE_NUMBER, EPISODE_NOT_FOUND, \
    SEASON_NOT_FOUND, SHOW_NOT_IN_DB, DEFAULT_PAGE_SIZE
from utils.documentation import SHOW_RETRIEVE_200_EXAMPLE, SHOWS_SEARCH_200_EXAMPLE, EPISODE_RETRIEVE_200_EXAMPLE, \
    SEASON_RETRIEVE_200_EXAMPLE
from utils.functions import get_page_size
from utils.openapi_params import query_param, page_param, page_size_param


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

        episode_run_time = tmdb_show['episode_run_time'][0] if len(tmdb_show['episode_run_time']) > 0 else 0
        show, created = Show.objects.get_or_create(
            tmdb_id=tmdb_show['id'],
            defaults={'tmdb_original_name': tmdb_show['original_name'],
                      'tmdb_name': tmdb_show['name'],
                      'tmdb_episode_run_time': episode_run_time,
                      'tmdb_backdrop_path': tmdb_show['backdrop_path']}
        )

        for season in tmdb_show['seasons']:
            episodes_user_info = []
            episodes = Episode.objects.filter(tmdb_show=tmdb_show['id'], tmdb_season_number=season['season_number'])
            for episode in episodes:
                try:
                    user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
                    user_info = UserEpisodeSerializer(user_episode).data
                except (UserEpisode.DoesNotExist, TypeError):
                    user_info = ()
                episodes_user_info.append(user_info)
            season.update({'episodes_user_info': episodes_user_info})

        try:
            user_show = UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED).get(user=request.user,
                                                                                         show=show)
            user_info = self.get_serializer(user_show).data
        except (UserShow.DoesNotExist, TypeError):
            user_info = None

        return Response({'tmdb': tmdb_show, 'user_info': user_info})

    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "status": openapi.Schema(
                type=openapi.TYPE_STRING,
                enum=list(dict(UserShow.STATUS_CHOICES).keys()) + list(dict(UserShow.STATUS_CHOICES).values())
            ),
            "score": openapi.Schema(
                type=openapi.TYPE_INTEGER,
                minimum=UserShow._meta.get_field('score').validators[0].limit_value,
                maximum=UserShow._meta.get_field('score').validators[1].limit_value
            ),
            "review": openapi.Schema(
                type=openapi.TYPE_STRING,
                maxLength=UserShow._meta.get_field('review').max_length
            )
        }
    ),
        responses={
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
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            show = Show.objects.get(tmdb_id=kwargs.get('tmdb_id'))
        except Show.DoesNotExist:
            try:
                tmdb_show = tmdb.TV(kwargs.get('tmdb_id')).info(language=LANGUAGE)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            show = Show.objects.create(tmdb_id=tmdb_show.get('id'),
                                       tmdb_original_name=tmdb_show.get('original_name'),
                                       tmdb_name=tmdb_show.get('name'),
                                       tmdb_episode_run_time=tmdb_show.get('episode_run_time')[0])

        data = request.data.copy()
        data.update({'user': request.user.pk,
                     'show': show.pk})

        try:
            user_show = UserShow.objects.get(user=request.user, show=show)
            serializer = self.get_serializer(user_show, data=data)
        except UserShow.DoesNotExist:
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses={status.HTTP_200_OK: FollowedUserShowSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_info(self, request, *args, **kwargs):
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            show = Show.objects.get(tmdb_id=kwargs.get('tmdb_id'))
            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_shows = UserShow.objects.filter(user__in=user_follow_query, show=show)
            serializer = FollowedUserShowSerializer(followed_user_shows, many=True)
            friends_info = serializer.data
        except (Show.DoesNotExist, ValueError):
            friends_info = ()

        paginator = Paginator(friends_info, page_size)
        paginator_page = paginator.get_page(page)

        return Response({'friends_info': paginator_page.object_list,
                         'has_next_page': paginator_page.has_next()})

    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'episodes': openapi.Schema(
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'season_number': openapi.Schema(
                            type=openapi.TYPE_INTEGER
                        ),
                        "episode_number": openapi.Schema(
                            type=openapi.TYPE_INTEGER
                        ),
                        "score": openapi.Schema(
                            type=openapi.TYPE_INTEGER,
                            minimum=UserEpisode._meta.get_field('score').validators[0].limit_value,
                            maximum=UserEpisode._meta.get_field('score').validators[1].limit_value
                        ),
                        "review": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            maxLength=UserEpisode._meta.get_field('review').max_length
                        )
                    }
                )
            )
        }
    ),
        responses={
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
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description=status.HTTP_400_BAD_REQUEST,
                examples={
                    "application/json": {
                        ERROR: SHOW_NOT_IN_DB
                    },
                }
            )
        }
    )
    @action(detail=True, methods=['put'])
    def episodes(self, request, *args, **kwargs):
        episodes = request.data.get('episodes')
        for data in episodes:
            try:
                episode = Episode.objects.get(tmdb_show=kwargs.get('tmdb_id'),
                                              tmdb_season_number=data['season_number'],
                                              tmdb_episode_number=data['episode_number'])
            except Episode.DoesNotExist:
                try:
                    tmdb_episode = tmdb.TV_Episodes(kwargs.get('tmdb_id'),
                                                    data['season_number'],
                                                    data['episode_number']).info(language=LANGUAGE)
                except HTTPError as e:
                    error_code = int(e.args[0].split(' ', 1)[0])
                    if error_code == 404:
                        return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                    return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

                try:
                    episode = Episode.objects.create(tmdb_id=tmdb_episode.get('id'),
                                                     tmdb_episode_number=tmdb_episode.get('episode_number'),
                                                     tmdb_season_number=tmdb_episode.get('season_number'),
                                                     tmdb_name=tmdb_episode.get('name'),
                                                     tmdb_show_id=kwargs.get('tmdb_id'))
                except IntegrityError:
                    return Response({ERROR: SHOW_NOT_IN_DB}, status=status.HTTP_400_BAD_REQUEST)

            data = data.copy()
            data.update({'user': request.user.pk,
                         'show': kwargs.get('tmdb_id'),
                         'episode': episode.pk})

            try:
                user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
                serializer = UserEpisodeSerializer(user_episode, data=data)
            except UserEpisode.DoesNotExist:
                serializer = UserEpisodeSerializer(data=data)

            serializer.is_valid(raise_exception=True)
            serializer.save()

        return Response(status=status.HTTP_200_OK)


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
            tmdb_season = tmdb.TV_Seasons(kwargs.get('show_tmdb_id'),
                                          kwargs.get('number')).info(language=LANGUAGE)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SEASON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            show_info, user_watched_show = get_show_info(kwargs.get('show_tmdb_id'), request.user)
        except (HTTPError, ConnectionError):
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        tmdb_season.update(show_info)

        for tmdb_episode in tmdb_season['episodes']:
            try:
                episode = Episode.objects.get(tmdb_id=tmdb_episode['id'])
                user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
                user_info = UserEpisodeSerializer(user_episode).data
            except (Episode.DoesNotExist, UserEpisode.DoesNotExist, TypeError):
                user_info = ()

            tmdb_episode.update({'user_info': user_info})

        try:
            season = Season.objects.get(tmdb_id=tmdb_season.get('id'))
            user_season = UserSeason.objects.get(user=request.user, season=season)
            user_info = self.get_serializer(user_season).data
        except (Season.DoesNotExist, UserSeason.DoesNotExist, TypeError):
            user_info = None

        return Response({'tmdb': tmdb_season, 'user_info': user_info, 'user_watched_show': user_watched_show})

    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "score": openapi.Schema(
                type=openapi.TYPE_INTEGER,
                minimum=UserSeason._meta.get_field('score').validators[0].limit_value,
                maximum=UserSeason._meta.get_field('score').validators[1].limit_value
            ),
            "review": openapi.Schema(
                type=openapi.TYPE_STRING,
                maxLength=UserSeason._meta.get_field('review').max_length
            )
        }
    ),
        responses={
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
            ),
            status.HTTP_400_BAD_REQUEST: openapi.Response(
                description=status.HTTP_400_BAD_REQUEST,
                examples={
                    "application/json": {
                        ERROR: SHOW_NOT_IN_DB
                    },
                }
            )
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            season = Season.objects.get(tmdb_show=kwargs.get('show_tmdb_id'), tmdb_season_number=kwargs.get('number'))
        except Season.DoesNotExist:
            try:
                tmdb_season = tmdb.TV_Seasons(kwargs.get('show_tmdb_id'), kwargs.get('number')).info(language=LANGUAGE)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: SEASON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                season = Season.objects.create(tmdb_id=tmdb_season.get('id'),
                                               tmdb_season_number=tmdb_season.get('season_number'),
                                               tmdb_name=tmdb_season.get('name'),
                                               tmdb_show_id=kwargs.get('show_tmdb_id'))
            except IntegrityError:
                return Response({ERROR: SHOW_NOT_IN_DB}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        data.update({'user': request.user.pk,
                     'season': season.pk})

        try:
            user_season = UserSeason.objects.get(user=request.user, season=season)
            serializer = self.get_serializer(user_season, data=data)
        except UserSeason.DoesNotExist:
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses={status.HTTP_200_OK: FollowedUserSeasonSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_info(self, request, *args, **kwargs):
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            season = Season.objects.get(tmdb_show=kwargs.get('show_tmdb_id'), tmdb_season_number=kwargs.get('number'))
            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_seasons = UserSeason.objects.filter(user__in=user_follow_query, season=season)
            serializer = FollowedUserSeasonSerializer(followed_user_seasons, many=True)
            friends_info = serializer.data
        except (Season.DoesNotExist, ValueError):
            friends_info = ()

        paginator = Paginator(friends_info, page_size)
        paginator_page = paginator.get_page(page)

        return Response({'friends_info': paginator_page.object_list,
                         'has_next_page': paginator_page.has_next()})


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
            show_info, user_watched_show = get_show_info(kwargs.get('show_tmdb_id'), request.user)
        except (HTTPError, ConnectionError):
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        tmdb_episode.update(show_info)

        try:
            episode = Episode.objects.get(tmdb_id=tmdb_episode.get('id'))
            user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
            user_info = self.get_serializer(user_episode).data
        except (Episode.DoesNotExist, UserEpisode.DoesNotExist, TypeError):
            user_info = None

        return Response({'tmdb': tmdb_episode, 'user_info': user_info, 'user_watched_show': user_watched_show})

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses={status.HTTP_200_OK: FollowedUserEpisodeSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_info(self, request, *args, **kwargs):
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            episode = Episode.objects.get(tmdb_show=kwargs.get('show_tmdb_id'),
                                          tmdb_season_number=kwargs.get('season_number'),
                                          tmdb_episode_number=kwargs.get('number'))
            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_episodes = UserEpisode.objects.filter(user__in=user_follow_query, episode=episode)
            serializer = FollowedUserEpisodeSerializer(followed_user_episodes, many=True)
            friends_info = serializer.data
        except (Episode.DoesNotExist, ValueError):
            friends_info = ()

        paginator = Paginator(friends_info, page_size)
        paginator_page = paginator.get_page(page)

        return Response({'friends_info': paginator_page.object_list,
                         'has_next_page': paginator_page.has_next()})


def get_show_info(show_id, user):
    user_watched_show = False
    try:
        show = Show.objects.get(tmdb_id=show_id)
        show_name = show.tmdb_name
        show_id = show.tmdb_id
        show_original_name = show.tmdb_original_name
        backdrop_path = show.tmdb_backdrop_path

        try:
            user_show = UserShow.objects.get(user=user, show=show)
            if user_show.status != UserShow.STATUS_NOT_WATCHED:
                user_watched_show = True
        except (UserShow.DoesNotExist, TypeError):
            pass

    except Show.DoesNotExist:
        try:
            tmdb_show = tmdb.TV(show_id).info(language=LANGUAGE)
        except HTTPError as e:
            raise HTTPError(e)

        show_name = tmdb_show['name']
        show_id = tmdb_show['id']
        show_original_name = tmdb_show['original_name']
        backdrop_path = tmdb_show['backdrop_path']

    return ({'show_name': show_name,
             'show_id': show_id,
             'show_original_name': show_original_name,
             'backdrop_path': backdrop_path}, user_watched_show)


def get_episode_info(show_id, season_number, episode_number, user):
    try:
        episode = Episode.objects.get(tmdb_show=show_id,
                                      tmdb_season_number=season_number,
                                      tmdb_episode_number=episode_number)
        user_episode = UserEpisode.objects.get(user=user, episode=episode)
        user_info = UserEpisodeSerializer(user_episode).data
    except (Episode.DoesNotExist, UserEpisode, TypeError):
        user_info = ()
    return user_info
