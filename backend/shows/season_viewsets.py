import tmdbsimple as tmdb
from django.core.cache import cache
from django.db.models import F
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError, ConnectionError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from shows.functions import get_season_new_fields, get_episodes_to_create_update_delete, get_tmdb_season_key
from shows.models import UserSeason, Show, Season, Episode, UserShow, UserEpisode
from shows.serializers import UserSeasonSerializer, FollowedUserSeasonSerializer, UserEpisodeInSeasonSerializer
from shows.show_viewsets import get_show_info, user_watched_show
from users.models import UserFollow
from utils.constants import ERROR, SEASON_NOT_FOUND, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, LANGUAGE, CACHE_TIMEOUT, \
    TMDB_POSTER_PATH_PREFIX
from utils.functions import update_fields_if_needed


class SeasonViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserSeason.objects.all()
    serializer_class = UserSeasonSerializer
    lookup_field = 'number'

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
            show_info = get_show_info(kwargs.get('show_tmdb_id'), request)
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        tmdb_season.update(show_info)
        new_fields = get_season_new_fields(tmdb_season)
        season, created = Season.objects.get_or_create(tmdb_show_id=tmdb_season.get('show').get('id'),
                                                       tmdb_season_number=tmdb_season.get('season_number'),
                                                       defaults=new_fields)
        if not created and not returned_from_cache:
            update_fields_if_needed(season, new_fields)

        episodes = tmdb_season.get('episodes')
        existed_episodes = Episode.objects.select_related('tmdb_season').filter(tmdb_season=season)
        episodes_to_create, episodes_to_update, episodes_to_delete_pks = get_episodes_to_create_update_delete(
            existed_episodes, episodes, season.id)

        Episode.objects.filter(pk__in=episodes_to_delete_pks).delete()
        Episode.objects.bulk_update(episodes_to_update,
                                    ['tmdb_episode_number', 'tmdb_season', 'tmdb_name', 'tmdb_release_date',
                                     'tmdb_runtime'])
        Episode.objects.bulk_create(episodes_to_create)

        return Response(parse_season(tmdb_season, request.scheme))

    def update(self, request, *args, **kwargs):
        try:
            show = Show.objects.get(tmdb_id=kwargs.get('show_tmdb_id'))
            season = Season.objects.get(tmdb_show=show, tmdb_season_number=kwargs.get('number'))
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
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
            show = Show.objects.get(tmdb_id=show_id)
            season = Season.objects.get(tmdb_show=show, tmdb_season_number=season_number)
            # user_info
            try:
                user_season = UserSeason.objects.get(user=request.user, season=season)
                user_info = self.get_serializer(user_season).data
            except UserSeason.DoesNotExist:
                user_info = None

            # friends_info
            user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
            followed_user_seasons = UserSeason.objects.select_related('user') \
                .filter(user__in=user_follow_query, season=season) \
                .exclude(id__in=UserSeason.objects
                         .filter(season__tmdb_show__usershow__user=F('user_id'),
                                 season__tmdb_show__usershow__status=UserShow.STATUS_NOT_WATCHED)) \
                .exclude(score=UserSeason._meta.get_field('score').get_default())
            serializer = FollowedUserSeasonSerializer(followed_user_seasons, many=True)
            friends_info = serializer.data
            episodes = Episode.objects.filter(tmdb_season=season)
            user_episodes = UserEpisode.objects.select_related('episode').filter(user=request.user,
                                                                                 episode__in=episodes)
            episodes_user_info = UserEpisodeInSeasonSerializer(user_episodes, many=True).data
        except (Show.DoesNotExist, Season.DoesNotExist, ValueError):
            show = None
            user_info = None
            friends_info = ()
            episodes_user_info = ()

        return Response({'user_info': user_info,
                         'episodes_user_info': episodes_user_info,
                         'friends_info': friends_info,
                         'user_watched_show': user_watched_show(show, request.user)})


def get_season(show_tmdb_id, season_number):
    returned_from_cache = True
    key = get_tmdb_season_key(show_tmdb_id, season_number)
    tmdb_season = cache.get(key, None)
    if tmdb_season is None:
        tmdb_season = tmdb.TV_Seasons(show_tmdb_id, season_number).info(language=LANGUAGE)
        cache.set(key, tmdb_season, CACHE_TIMEOUT)
        returned_from_cache = False
    return tmdb_season, returned_from_cache


def parse_season(tmdb_season, schema):
    new_season = {
        'id': tmdb_season.get('id'),
        'name': tmdb_season.get('name'),
        'overview': tmdb_season.get('overview'),
        'poster_path': get_proxy_url(schema, TMDB_POSTER_PATH_PREFIX, tmdb_season.get('poster_path')),
        'air_date': '.'.join(reversed(tmdb_season['air_date'].split('-')))
        if tmdb_season.get('air_date') is not None else None,
        'season_number': tmdb_season.get('season_number'),
        'show': tmdb_season.get('show'),
        'episodes': tmdb_season.get('episodes')
    }

    return new_season
