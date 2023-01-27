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
from shows.functions import get_tmdb_episode_key
from shows.models import UserEpisode, Show, Season, Episode, UserShow
from shows.serializers import UserEpisodeSerializer, FollowedUserEpisodeSerializer
from shows.viewsets import get_show_info, user_watched_show
from users.models import UserFollow
from utils.constants import ERROR, EPISODE_NOT_FOUND, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, EPISODE_NOT_WATCHED_SCORE, \
    LANGUAGE, CACHE_TIMEOUT, TMDB_STILL_PATH_PREFIX


class EpisodeViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserEpisode.objects.all()
    serializer_class = UserEpisodeSerializer
    lookup_field = 'number'

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
            show_info = get_show_info(kwargs.get('show_tmdb_id'), request)
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        tmdb_episode.update(show_info)
        return Response(parse_episode(tmdb_episode, request.scheme))

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserEpisodeSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, **kwargs):
        show_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('season_number')
        episode_number = kwargs.get('number')

        try:
            show = Show.objects.get(tmdb_id=show_id)
            season = Season.objects.get(tmdb_show=show,
                                        tmdb_season_number=season_number)
            episode = Episode.objects.get(tmdb_season=season,
                                          tmdb_episode_number=episode_number)

            # user_info
            try:
                user_episode = UserEpisode.objects.get(user=request.user, episode=episode)
                user_info = self.get_serializer(user_episode).data
            except UserEpisode.DoesNotExist:
                user_info = None

            # friends_info
            user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
            followed_user_episodes = UserEpisode.objects.select_related('user') \
                .filter(user__in=user_follow_query, episode=episode) \
                .exclude(id__in=UserEpisode.objects
                         .filter(episode__tmdb_season__tmdb_show__usershow__user=F('user_id'),
                                 episode__tmdb_season__tmdb_show__usershow__status=UserShow.STATUS_NOT_WATCHED)) \
                .exclude(score=EPISODE_NOT_WATCHED_SCORE)
            serializer = FollowedUserEpisodeSerializer(followed_user_episodes, many=True)
            friends_info = serializer.data
        except (Show.DoesNotExist, Season.DoesNotExist, Episode.DoesNotExist, ValueError):
            show = None
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info,
                         'friends_info': friends_info,
                         'user_watched_show': user_watched_show(show, request.user)})


def get_episode(show_tmdb_id, season_number, episode_number):
    key = get_tmdb_episode_key(show_tmdb_id, season_number, episode_number)
    tmdb_episode = cache.get(key, None)
    if tmdb_episode is None:
        tmdb_episode = tmdb.TV_Episodes(show_tmdb_id, season_number, episode_number).info(language=LANGUAGE)
        cache.set(key, tmdb_episode, CACHE_TIMEOUT)
    return tmdb_episode


def parse_episode(tmdb_episode, schema):
    new_episode = {
        'id': tmdb_episode.get('id'),
        'name': tmdb_episode.get('name'),
        'overview': tmdb_episode.get('overview'),
        'score': int(tmdb_episode['vote_average'] * 10) if tmdb_episode.get('vote_average') is not None else None,
        'runtime': tmdb_episode.get('runtime') if tmdb_episode.get('runtime') is not None else 0,
        'still_path': get_proxy_url(schema, TMDB_STILL_PATH_PREFIX, tmdb_episode.get('still_path')),
        'air_date': '.'.join(reversed(tmdb_episode['air_date'].split('-')))
        if tmdb_episode.get('air_date') != "" else None,
        'season_number': tmdb_episode.get('season_number'),
        'episode_number': tmdb_episode.get('episode_number'),
        'show': tmdb_episode.get('show'),
    }

    return new_episode
