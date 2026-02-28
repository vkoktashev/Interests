from datetime import timedelta

from django.db.models import F
from django.utils import timezone
from utils.swagger import swagger_auto_schema
from requests import HTTPError, ConnectionError, Timeout
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from shows.functions import get_tmdb_episode, get_episode_new_fields, get_tmdb_episode_credits, sync_episode_people, \
    get_tmdb_show, get_tmdb_show_videos, get_tmdb_show_credits, get_show_new_fields, sync_show_genres, \
    sync_show_people, get_tmdb_season, get_season_new_fields, sync_season_episodes, get_tmdb_season_credits, \
    sync_season_people
from shows.models import UserEpisode, Show, Season, Episode, UserShow, EpisodePerson
from shows.serializers import UserEpisodeSerializer, FollowedUserEpisodeSerializer, ShowSerializer
from shows.show_viewsets import user_watched_show
from shows.tasks import refresh_episode_details
from users.models import UserFollow
from utils.constants import ERROR, EPISODE_NOT_FOUND, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, EPISODE_NOT_WATCHED_SCORE
from utils.functions import update_fields_if_needed

EPISODE_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)


class EpisodeViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserEpisode.objects.all()
    serializer_class = UserEpisodeSerializer
    lookup_field = 'number'

    def retrieve(self, request, *args, **kwargs):
        show_tmdb_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('season_number')
        episode_number = kwargs.get('number')

        show = Show.objects.filter(tmdb_id=show_tmdb_id).first()
        if show is None:
            try:
                tmdb_show = get_tmdb_show(show_tmdb_id)
                tmdb_show_videos = get_tmdb_show_videos(show_tmdb_id)
                tmdb_show_credits = get_tmdb_show_credits(show_tmdb_id)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (ConnectionError, Timeout):
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            show_fields = get_show_new_fields(tmdb_show, tmdb_show_videos)
            show, created = Show.objects.get_or_create(tmdb_id=show_tmdb_id, defaults=show_fields)
            if not created:
                update_fields_if_needed(show, show_fields)
            sync_show_genres(show, tmdb_show)
            sync_show_people(show, tmdb_show_credits)

        season = Season.objects.filter(tmdb_show=show, tmdb_season_number=season_number).first()
        if season is not None and not season.episode_set.exists():
            try:
                tmdb_season = get_tmdb_season(show_tmdb_id, season_number)
                tmdb_season_credits = get_tmdb_season_credits(show_tmdb_id, season_number)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (ConnectionError, Timeout):
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            season_fields = get_season_new_fields(tmdb_season, show.id)
            update_fields_if_needed(season, season_fields)
            sync_season_episodes(season, tmdb_season.get('episodes') or [])
            sync_season_people(season, tmdb_season_credits)

        if season is None:
            try:
                tmdb_season = get_tmdb_season(show_tmdb_id, season_number)
                tmdb_season_credits = get_tmdb_season_credits(show_tmdb_id, season_number)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (ConnectionError, Timeout):
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            season_fields = get_season_new_fields(tmdb_season, show.id)
            season, created = Season.objects.get_or_create(
                tmdb_show=show,
                tmdb_season_number=tmdb_season.get('season_number'),
                defaults=season_fields
            )
            if not created:
                update_fields_if_needed(season, season_fields)
            sync_season_episodes(season, tmdb_season.get('episodes') or [])
            sync_season_people(season, tmdb_season_credits)

        episode = Episode.objects.filter(tmdb_season=season, tmdb_episode_number=episode_number).first()
        should_fetch_from_tmdb = episode is None or episode.tmdb_last_update is None

        if should_fetch_from_tmdb:
            try:
                tmdb_episode = get_tmdb_episode(show_tmdb_id, season_number, episode_number)
                tmdb_episode_credits = get_tmdb_episode_credits(show_tmdb_id, season_number, episode_number)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (ConnectionError, Timeout):
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            defaults = get_episode_new_fields(tmdb_episode, season.id)
            episode, created = Episode.objects.get_or_create(
                tmdb_season=season,
                tmdb_episode_number=tmdb_episode.get('episode_number'),
                defaults=defaults
            )
            if not created:
                update_fields_if_needed(episode, defaults)

            sync_episode_people(episode, tmdb_episode_credits)

        response = Response(parse_episode(episode, request))
        if episode.tmdb_last_update and episode.tmdb_last_update <= timezone.now() - EPISODE_DETAILS_REFRESH_INTERVAL:
            response.add_post_render_callback(
                lambda _: enqueue_episode_refresh(show.tmdb_id, season.tmdb_season_number, episode.tmdb_episode_number)
            )
        return response

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserEpisodeSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, **kwargs):
        try:
            episode = Episode.objects.select_related('tmdb_season__tmdb_show').get(
                tmdb_season__tmdb_show__tmdb_id=kwargs.get('show_tmdb_id'),
                tmdb_season__tmdb_season_number=kwargs.get('season_number'),
                tmdb_episode_number=kwargs.get('number')
            )
            season = episode.tmdb_season
            show = season.tmdb_show

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


def parse_episode(episode, request):
    cast_names = [episode_person.person.name for episode_person in episode.episodeperson_set.select_related('person')
                  .filter(role=EpisodePerson.ROLE_ACTOR).order_by('sort_order')]
    director_names = [episode_person.person.name for episode_person in episode.episodeperson_set.select_related('person')
                      .filter(role=EpisodePerson.ROLE_DIRECTOR).order_by('sort_order')]
    return {
        'id': episode.tmdb_id,
        'name': episode.tmdb_name,
        'overview': episode.tmdb_overview,
        'score': episode.tmdb_score,
        'runtime': episode.tmdb_runtime,
        'still_path': get_proxy_url(request, episode.tmdb_still_path),
        'air_date': format_date(episode.tmdb_release_date),
        'season_number': episode.tmdb_season.tmdb_season_number,
        'episode_number': episode.tmdb_episode_number,
        'show': ShowSerializer(episode.tmdb_season.tmdb_show, context={'request': request}).data,
        'cast': ', '.join(cast_names),
        'directors': ', '.join(director_names),
    }


def enqueue_episode_refresh(show_tmdb_id, season_number, episode_number):
    try:
        refresh_episode_details.delay(show_tmdb_id, season_number, episode_number)
    except Exception:
        pass


def format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        if len(parts) == 3:
            return '.'.join(reversed(parts))
        return value
    return value.strftime('%d.%m.%Y')
