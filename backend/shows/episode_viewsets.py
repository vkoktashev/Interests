from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from utils.swagger import openapi, swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from integrations.tmdb import TmdbNotFoundError, TmdbUnavailableError
from proxy.functions import get_proxy_url
from shows.functions import (
    get_episode_new_fields,
    get_season_new_fields,
    get_tmdb_episode,
    get_tmdb_episode_credits,
    get_tmdb_episode_videos,
    get_tmdb_season,
    get_tmdb_season_credits,
    sync_episode_people,
    sync_season_episodes,
    sync_season_people,
)
from shows.models import UserEpisode, Show, Season, Episode, UserShow, EpisodePerson
from shows.serializers import UserEpisodeSerializer, FollowedUserEpisodeSerializer, ShowSerializer
from shows.selectors import user_watched_show
from shows.services.catalog import (
    ShowNotFoundError as CatalogShowNotFoundError,
    TmdbUnavailableError as CatalogTmdbUnavailableError,
    enqueue_show_refresh,
    get_show_for_detail,
    show_refresh_is_due,
)
from shows.tasks import refresh_episode_details, refresh_season_details
from users.functions import get_public_non_followed_user_ids
from users.models import UserFollow
from utils.celery import enqueue_background_task_once
from utils.constants import ERROR, EPISODE_NOT_FOUND, TMDB_UNAVAILABLE, SHOW_NOT_FOUND, EPISODE_NOT_WATCHED_SCORE
from utils.functions import update_fields_if_needed
from videos.functions import serialize_tmdb_videos


EPISODE_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)
SEASON_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)


class EpisodeViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserEpisode.objects.all()
    serializer_class = UserEpisodeSerializer
    lookup_field = 'number'

    def retrieve(self, request, *args, **kwargs):
        show_tmdb_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('season_number')
        episode_number = kwargs.get('number')
        try:
            show, _ = get_show_for_detail(show_tmdb_id)
        except CatalogShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except CatalogTmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        show_needs_refresh = show_refresh_is_due(show)

        season = Season.objects.filter(tmdb_show=show, tmdb_season_number=season_number).first()
        has_missing_episodes = season is not None and not season.episode_set.exists()
        should_fetch_season = season is None or season.tmdb_last_update is None or has_missing_episodes
        if should_fetch_season:
            try:
                tmdb_season = get_tmdb_season(show_tmdb_id, season_number)
                tmdb_season_credits = get_tmdb_season_credits(show_tmdb_id, season_number)
            except TmdbNotFoundError:
                return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            except TmdbUnavailableError:
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            with transaction.atomic():
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
        should_fetch_from_tmdb = episode is None or episode.tmdb_last_update is None or should_fetch_season

        if should_fetch_from_tmdb:
            try:
                tmdb_episode = get_tmdb_episode(show_tmdb_id, season_number, episode_number)
                tmdb_episode_credits = get_tmdb_episode_credits(
                    show_tmdb_id,
                    season_number,
                    episode_number,
                )
            except TmdbNotFoundError:
                return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            except TmdbUnavailableError:
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            with transaction.atomic():
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
        if show_needs_refresh:
            response.add_post_render_callback(lambda _: enqueue_show_refresh(show.tmdb_id))
        if season.tmdb_last_update and (
                season.tmdb_last_update <= timezone.now() - SEASON_DETAILS_REFRESH_INTERVAL
        ):
            response.add_post_render_callback(lambda _: enqueue_season_refresh(
                show.tmdb_id,
                season.tmdb_season_number,
            ))
        if episode.tmdb_last_update and (
                episode.tmdb_last_update <= timezone.now() - EPISODE_DETAILS_REFRESH_INTERVAL
        ):
            response.add_post_render_callback(lambda _: enqueue_episode_refresh(
                show.tmdb_id,
                season.tmdb_season_number,
                episode.tmdb_episode_number,
            ))
        return response

    @swagger_auto_schema(
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Episode not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def trailers(self, request, *args, **kwargs):
        show_tmdb_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('season_number')
        episode_number = kwargs.get('number')
        try:
            episode = Episode.objects.get(
                tmdb_season__tmdb_show__tmdb_id=show_tmdb_id,
                tmdb_season__tmdb_season_number=season_number,
                tmdb_episode_number=episode_number,
            )
            tmdb_videos = get_tmdb_episode_videos(show_tmdb_id, season_number, episode_number)
        except Episode.DoesNotExist:
            return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbNotFoundError:
            return Response({ERROR: EPISODE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(serialize_tmdb_videos(tmdb_videos))

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

            public_user_ids = get_public_non_followed_user_ids(request.user)
            public_user_episodes = UserEpisode.objects.select_related('user') \
                .filter(user__in=public_user_ids, episode=episode) \
                .exclude(id__in=UserEpisode.objects
                         .filter(episode__tmdb_season__tmdb_show__usershow__user=F('user_id'),
                                 episode__tmdb_season__tmdb_show__usershow__status=UserShow.STATUS_NOT_WATCHED)) \
                .exclude(score=EPISODE_NOT_WATCHED_SCORE) \
                .order_by('-id')[:20]
            serializer = FollowedUserEpisodeSerializer(public_user_episodes, many=True)
            users_info = serializer.data
        except (Show.DoesNotExist, Season.DoesNotExist, Episode.DoesNotExist, ValueError):
            show = None
            user_info = None
            friends_info = ()
            users_info = ()

        return Response({'user_info': user_info,
                         'friends_info': friends_info,
                         'users_info': users_info,
                         'user_watched_show': user_watched_show(show, request.user)})


def parse_episode(episode, request):
    cast_names = [
        episode_person.person.name
        for episode_person in episode.episodeperson_set.select_related('person')
        .filter(role=EpisodePerson.ROLE_ACTOR).order_by('sort_order')
    ]
    director_names = [
        episode_person.person.name
        for episode_person in episode.episodeperson_set.select_related('person')
        .filter(role=EpisodePerson.ROLE_DIRECTOR).order_by('sort_order')
    ]
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
    enqueue_background_task_once(
        refresh_episode_details,
        identity=f'{show_tmdb_id}:{season_number}:{episode_number}',
        args=(show_tmdb_id, season_number, episode_number),
        task_name='refresh_episode_details'
    )


def enqueue_season_refresh(show_tmdb_id, season_number):
    enqueue_background_task_once(
        refresh_season_details,
        identity=f'{show_tmdb_id}:{season_number}',
        args=(show_tmdb_id, season_number),
        task_name='refresh_season_details'
    )


def format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        if len(parts) == 3:
            return '.'.join(reversed(parts))
        return value
    return value.strftime('%d.%m.%Y')
