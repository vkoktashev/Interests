from datetime import datetime

import psycopg2
import tmdbsimple as tmdb
from django.core.cache import cache
from django.db import transaction, IntegrityError
from django.db.models import F, Q
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import Genre
from shows.models import UserShow, Show, UserSeason, Season, UserEpisode, Episode, ShowGenre, EpisodeLog, ShowLog
from shows.serializers import UserShowSerializer, UserSeasonSerializer, UserEpisodeSerializer, \
    FollowedUserShowSerializer, FollowedUserSeasonSerializer, FollowedUserEpisodeSerializer, \
    UserEpisodeInSeasonSerializer
from users.models import UserFollow
from utils.constants import ERROR, LANGUAGE, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, DEFAULT_PAGE_NUMBER, EPISODE_NOT_FOUND, \
    SEASON_NOT_FOUND, CACHE_TIMEOUT, EPISODE_NOT_WATCHED_SCORE, EPISODE_WATCHED_SCORE
from utils.documentation import SHOW_RETRIEVE_200_EXAMPLE, SHOWS_SEARCH_200_EXAMPLE, EPISODE_RETRIEVE_200_EXAMPLE, \
    SEASON_RETRIEVE_200_EXAMPLE
from utils.functions import update_fields_if_needed, get_tmdb_show_key, get_tmdb_episode_key, get_tmdb_season_key
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
            results = get_show_search_results(query, page)
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
            tmdb_show, returned_from_cache = get_show(kwargs.get('tmdb_id'))
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        episode_run_time = tmdb_show['episode_run_time'][0] if len(tmdb_show['episode_run_time']) > 0 else 0

        new_fields = {
            'tmdb_original_name': tmdb_show['original_name'],
            'tmdb_name': tmdb_show['name'],
            'tmdb_episode_run_time': episode_run_time,
            'tmdb_backdrop_path': tmdb_show['backdrop_path'],
            'tmdb_release_date': tmdb_show['first_air_date'] if tmdb_show['first_air_date'] != "" else None
        }

        with transaction.atomic():
            show, created = Show.objects.select_for_update().get_or_create(tmdb_id=tmdb_show['id'],
                                                                           defaults=new_fields)
            if not created and not returned_from_cache:
                update_fields_if_needed(show, new_fields)

        if created or not returned_from_cache:
            for genre in tmdb_show.get('genres'):
                genre_obj, created = Genre.objects.get_or_create(tmdb_id=genre.get('id'),
                                                                 defaults={
                                                                     'tmdb_name': genre.get('name')
                                                                 })
                ShowGenre.objects.get_or_create(genre=genre_obj, show=show)

        return Response({'tmdb': tmdb_show})

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
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

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

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserShowSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        try:
            show = Show.objects.get(tmdb_id=kwargs.get('tmdb_id'))

            try:
                user_show = UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED).get(user=request.user,
                                                                                             show=show)
                user_info = self.get_serializer(user_show).data
            except UserShow.DoesNotExist:
                user_info = None

            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_shows = UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED) \
                .filter(user__in=user_follow_query, show=show)
            serializer = FollowedUserShowSerializer(followed_user_shows, many=True)
            friends_info = serializer.data
        except (Show.DoesNotExist, ValueError):
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

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
            )
        }
    )
    @action(detail=True, methods=['put'])
    def episodes(self, request, *args, **kwargs):
        episodes = request.data.get('episodes')
        first_watched_episode_log = None
        first_not_watched_episode_log = None
        watched_episodes_count = 0
        not_watched_episodes_count = 0

        for data in episodes:
            try:
                episode = Episode.objects.get(tmdb_show=kwargs.get('tmdb_id'),
                                              tmdb_season_number=data['season_number'],
                                              tmdb_episode_number=data['episode_number'])
            except Episode.DoesNotExist:
                return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

            data = data.copy()
            data.update({'user': request.user.pk,
                         'show': kwargs.get('tmdb_id'),
                         'episode': episode.pk})

            try:
                user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
                current_user_episode_score = user_episode.score
                current_user_episode_review = user_episode.review
                serializer = UserEpisodeSerializer(user_episode, data=data)
            except UserEpisode.DoesNotExist:
                user_episode = None
                serializer = UserEpisodeSerializer(data=data)
                current_user_episode_score = EPISODE_NOT_WATCHED_SCORE
                current_user_episode_review = ''

            serializer.is_valid(raise_exception=True)
            serializer.save()

            if user_episode is not None and current_user_episode_review != serializer.data.get('review') or \
                    user_episode is None and serializer.data.get('review') != '':
                EpisodeLog.objects.create(user=request.user, episode=episode,
                                          action_type='review', action_result=serializer.validated_data.get('review'))

            if current_user_episode_score == EPISODE_NOT_WATCHED_SCORE and \
                    serializer.data.get('score') == EPISODE_WATCHED_SCORE:
                if watched_episodes_count == 0:
                    if user_episode is not None and current_user_episode_score != serializer.data.get('score') or \
                            user_episode is None and serializer.data.get('score') != EPISODE_NOT_WATCHED_SCORE:
                        first_watched_episode_log = EpisodeLog(user=request.user, episode=episode,
                                                               action_type='score',
                                                               action_result=serializer.validated_data.get('score'))
                watched_episodes_count += 1

            elif current_user_episode_score != EPISODE_NOT_WATCHED_SCORE and \
                    serializer.data.get('score') == EPISODE_NOT_WATCHED_SCORE:
                if not_watched_episodes_count == 0:
                    if user_episode is not None:
                        first_not_watched_episode_log = EpisodeLog(user=request.user, episode=episode,
                                                                   action_type='score',
                                                                   action_result=serializer.validated_data.get('score'))
                not_watched_episodes_count += 1

            elif user_episode is not None and current_user_episode_score != serializer.data.get('score') or \
                    user_episode is None and serializer.data.get('score') != EPISODE_NOT_WATCHED_SCORE:
                EpisodeLog.objects.create(user=request.user, episode=episode,
                                          action_type='score', action_result=serializer.validated_data.get('score'))

        if watched_episodes_count > 1:
            ShowLog.objects.create(user=request.user, show_id=kwargs.get('tmdb_id'),
                                   action_type='episodes', action_result=watched_episodes_count)
        elif watched_episodes_count == 1 and first_watched_episode_log is not None:
            first_watched_episode_log.save()

        if not_watched_episodes_count > 1:
            ShowLog.objects.create(user=request.user, show_id=kwargs.get('tmdb_id'),
                                   action_type='episodes', action_result=-not_watched_episodes_count)
        elif not_watched_episodes_count == 1 and first_not_watched_episode_log is not None:
            first_not_watched_episode_log.save()

        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def upcoming_releases(self, request, *args, **kwargs):
        today_date = datetime.today().date()
        shows = Show.objects.filter(usershow__user=request.user).exclude(usershow__status=UserShow.STATUS_NOT_WATCHED)
        episodes = Episode.objects.select_related('tmdb_show').filter(tmdb_show__in=shows,
                                                                      tmdb_release_date__gt=today_date)

        return Response()

    # @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    # def test(self, request, *args, **kwargs):
    #     today_date = datetime.today().date()
    #
    #     seasons_to_check = Episode.objects.select_related('tmdb_show') \
    #         .filter(Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None)) \
    #         .exclude(tmdb_season_number=0) \
    #         .values('tmdb_show__tmdb_id', 'tmdb_season_number').distinct()
    #
    #     for season in seasons_to_check:
    #         show_id = season['tmdb_show__tmdb_id']
    #         season_number = season['tmdb_season_number']
    #         key = get_tmdb_season_key(show_id, season_number)
    #         try:
    #             tmdb_season = tmdb.TV_Seasons(show_id, season_number).info(language=LANGUAGE)
    #         except HTTPError as e:
    #             error_code = int(e.args[0].split(' ', 1)[0])
    #             if error_code == 404:
    #                 continue
    #             else:
    #                 print('ОШИБКА', error_code)
    #                 raise HTTPError(e)
    #         cache.set(key, tmdb_season, CACHE_TIMEOUT)
    #
    #         episodes = tmdb_season.get('episodes')
    #         existed_episodes = Episode.objects.filter(
    #             tmdb_id__in=[episode.get('id') for episode in episodes])
    #         episodes_to_create = []
    #
    #         for episode in episodes:
    #             exists = False
    #
    #             for existed_episode in existed_episodes:
    #                 if episode['id'] == existed_episode.tmdb_id:
    #                     exists = True
    #
    #                     new_fields = {
    #                         'tmdb_id': episode.get('id'),
    #                         'tmdb_episode_number': episode.get('episode_number'),
    #                         'tmdb_season_number': episode.get('season_number'),
    #                         'tmdb_name': episode.get('name'),
    #                         'tmdb_show_id': existed_episode.tmdb_show_id,
    #                         'tmdb_release_date': episode.get('air_date') if episode.get('air_date') != "" else None
    #                     }
    #                     update_fields_if_needed(existed_episode, new_fields)
    #                     #print(existed_episode.__dict__)
    #                     break
    #
    #             if not exists:
    #                 #print(episode)
    #                 episodes_to_create.append(Episode(tmdb_id=episode.get('id'),
    #                                                   tmdb_episode_number=episode.get('episode_number'),
    #                                                   tmdb_season_number=episode.get('season_number'),
    #                                                   tmdb_name=episode.get('name'),
    #                                                   tmdb_show_id=kwargs.get('show_tmdb_id')))
    #
    #         Episode.objects.bulk_create(episodes_to_create)

        # seasons = Season.objects.filter(tmdb_season_number__in=list(episodes))
        #
        # for s in seasons:
        #     print(s.tmdb_season_number, s.tmdb_show.tmdb_name)

        return Response()


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
            tmdb_season, returned_from_cache = get_season(kwargs.get('show_tmdb_id'),
                                                          kwargs.get('number'))
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SEASON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            show_info = get_show_info(kwargs.get('show_tmdb_id'))
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        tmdb_season.update(show_info)

        new_fields = {
            'tmdb_season_number': tmdb_season.get('season_number'),
            'tmdb_name': tmdb_season.get('name'),
            'tmdb_show_id': kwargs.get('show_tmdb_id')
        }

        with transaction.atomic():
            season, created = Season.objects.select_for_update().get_or_create(tmdb_id=tmdb_season.get('id'),
                                                                               defaults=new_fields)
            if not created and not returned_from_cache:
                update_fields_if_needed(season, new_fields)

        with transaction.atomic():
            episodes = tmdb_season.get('episodes')
            existed_episodes = Episode.objects.select_for_update().filter(
                tmdb_id__in=[episode.get('id') for episode in episodes])
            episodes_to_create = []

            for episode in episodes:
                exists = False

                for existed_episode in existed_episodes:
                    if episode['id'] == existed_episode.tmdb_id:
                        exists = True
                        new_fields = {
                            'tmdb_id': episode.get('id'),
                            'tmdb_episode_number': episode.get('episode_number'),
                            'tmdb_season_number': episode.get('season_number'),
                            'tmdb_name': episode.get('name'),
                            'tmdb_show_id': kwargs.get('show_tmdb_id'),
                            'tmdb_release_date': episode.get('air_date') if episode.get('air_date') != "" else None
                        }
                        update_fields_if_needed(existed_episode, new_fields)
                        break

                if not exists:
                    episodes_to_create.append(Episode(tmdb_id=episode.get('id'),
                                                      tmdb_episode_number=episode.get('episode_number'),
                                                      tmdb_season_number=episode.get('season_number'),
                                                      tmdb_name=episode.get('name'),
                                                      tmdb_show_id=kwargs.get('show_tmdb_id')))

            Episode.objects.bulk_create(episodes_to_create)

        return Response({'tmdb': tmdb_season})

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
            )
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            season = Season.objects.get(tmdb_show=kwargs.get('show_tmdb_id'), tmdb_season_number=kwargs.get('number'))
        except Season.DoesNotExist:
            return Response({ERROR: SEASON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

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

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserSeasonSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        show_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('number')

        try:
            season = Season.objects.get(tmdb_show=show_id, tmdb_season_number=season_number)

            # user_info
            try:
                user_season = UserSeason.objects.get(user=request.user, season=season)
                user_info = self.get_serializer(user_season).data
            except UserSeason.DoesNotExist:
                user_info = None

            # friends_info
            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_seasons = UserSeason.objects \
                .filter(user__in=user_follow_query, season=season) \
                .exclude(id__in=UserSeason.objects
                         .filter(season__tmdb_show__usershow__user=F('user_id'),
                                 season__tmdb_show__usershow__status=UserShow.STATUS_NOT_WATCHED)) \
                .exclude(score=UserSeason._meta.get_field('score').get_default())
            serializer = FollowedUserSeasonSerializer(followed_user_seasons, many=True)
            friends_info = serializer.data
        except (Season.DoesNotExist, ValueError):
            user_info = None
            friends_info = ()

        episodes = Episode.objects.filter(tmdb_show=show_id, tmdb_season_number=season_number)
        user_episodes = UserEpisode.objects.prefetch_related('episode').filter(user=request.user, episode__in=episodes)
        episodes_user_info = UserEpisodeInSeasonSerializer(user_episodes, many=True).data

        return Response({'user_info': user_info,
                         'episodes_user_info': episodes_user_info,
                         'friends_info': friends_info,
                         'user_watched_show': user_watched_show(show_id, request.user)})


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
            tmdb_episode = get_episode(kwargs.get('show_tmdb_id'),
                                       kwargs.get('season_number'),
                                       kwargs.get('number'))
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            show_info = get_show_info(kwargs.get('show_tmdb_id'))
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        tmdb_episode.update(show_info)

        return Response({'tmdb': tmdb_episode})

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserEpisodeSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        show_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('season_number')
        episode_number = kwargs.get('number')

        try:
            episode = Episode.objects.get(tmdb_show=show_id,
                                          tmdb_season_number=season_number,
                                          tmdb_episode_number=episode_number)

            # user_info
            try:
                user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
                user_info = self.get_serializer(user_episode).data
            except UserEpisode.DoesNotExist:
                user_info = None

            # friends_info
            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_episodes = UserEpisode.objects.filter(user__in=user_follow_query, episode=episode) \
                .exclude(id__in=UserEpisode.objects
                         .filter(episode__tmdb_show__usershow__user=F('user_id'),
                                 episode__tmdb_show__usershow__status=UserShow.STATUS_NOT_WATCHED)) \
                .exclude(score=EPISODE_NOT_WATCHED_SCORE)
            serializer = FollowedUserEpisodeSerializer(followed_user_episodes, many=True)
            friends_info = serializer.data
        except (Episode.DoesNotExist, ValueError):
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info,
                         'friends_info': friends_info,
                         'user_watched_show': user_watched_show(show_id, request.user)})


def user_watched_show(show_id, user):
    try:
        show = Show.objects.get(tmdb_id=show_id)
    except Show.DoesNotExist:
        return False

    user_show = UserShow.objects.filter(user=user, show=show).first()
    if user_show is not None and user_show.status != UserShow.STATUS_NOT_WATCHED:
        return True

    return False


def get_show_info(show_id):
    show = Show.objects.get(tmdb_id=show_id)

    return {'show_name': show.tmdb_name,
            'show_id': show.tmdb_id,
            'show_original_name': show.tmdb_original_name,
            'backdrop_path': show.tmdb_backdrop_path}


def get_show_search_results(query, page):
    key = f'tmdb_show_search_{query}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().tv(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_show(tmdb_id):
    returned_from_cache = True
    key = get_tmdb_show_key(tmdb_id)
    tmdb_show = cache.get(key, None)
    if tmdb_show is None:
        tmdb_show = tmdb.TV(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_show, CACHE_TIMEOUT)
        returned_from_cache = False
    return tmdb_show, returned_from_cache


def get_season(show_tmdb_id, season_number):
    returned_from_cache = True
    key = get_tmdb_season_key(show_tmdb_id, season_number)
    tmdb_season = cache.get(key, None)
    if tmdb_season is None:
        tmdb_season = tmdb.TV_Seasons(show_tmdb_id, season_number).info(language=LANGUAGE)
        cache.set(key, tmdb_season, CACHE_TIMEOUT)
        returned_from_cache = False
    return tmdb_season, returned_from_cache


def get_episode(show_tmdb_id, season_number, episode_number):
    key = get_tmdb_episode_key(show_tmdb_id, season_number, episode_number)
    tmdb_episode = cache.get(key, None)
    if tmdb_episode is None:
        tmdb_episode = tmdb.TV_Episodes(show_tmdb_id, season_number, episode_number).info(language=LANGUAGE)
        cache.set(key, tmdb_episode, CACHE_TIMEOUT)
    return tmdb_episode
