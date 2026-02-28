from datetime import timedelta

from django.db.models import F
from django.utils import timezone
from utils.swagger import openapi, swagger_auto_schema
from requests import HTTPError, ConnectionError, Timeout
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from shows.functions import get_tmdb_season, get_season_new_fields, sync_season_episodes, \
    get_tmdb_season_credits, sync_season_people, get_tmdb_show, get_tmdb_show_videos, get_tmdb_show_credits, \
    get_show_new_fields, sync_show_genres, sync_show_people
from shows.models import UserSeason, Show, Season, Episode, UserShow, UserEpisode, SeasonPerson
from shows.serializers import UserSeasonSerializer, FollowedUserSeasonSerializer, UserEpisodeInSeasonSerializer, \
    ShowSerializer
from shows.show_viewsets import user_watched_show
from shows.tasks import refresh_season_details
from users.models import UserFollow
from utils.constants import ERROR, SEASON_NOT_FOUND, TMDB_UNAVAILABLE, SHOW_NOT_FOUND
from utils.functions import update_fields_if_needed

SEASON_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)


class SeasonViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserSeason.objects.all()
    serializer_class = UserSeasonSerializer
    lookup_field = 'number'

    def retrieve(self, request, *args, **kwargs):
        show_tmdb_id = kwargs.get('show_tmdb_id')
        season_number = kwargs.get('number')

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
        has_missing_episodes = season is not None and not season.episode_set.exists()
        should_fetch_from_tmdb = season is None or season.tmdb_last_update is None or has_missing_episodes

        if should_fetch_from_tmdb:
            try:
                tmdb_season = get_tmdb_season(show_tmdb_id, season_number)
                tmdb_season_credits = get_tmdb_season_credits(show_tmdb_id, season_number)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: SEASON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (ConnectionError, Timeout):
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            defaults = get_season_new_fields(tmdb_season, show.id)
            season, created = Season.objects.get_or_create(
                tmdb_show=show,
                tmdb_season_number=tmdb_season.get('season_number'),
                defaults=defaults
            )
            if not created:
                update_fields_if_needed(season, defaults)

            sync_season_episodes(season, tmdb_season.get('episodes') or [])
            sync_season_people(season, tmdb_season_credits)

        response = Response(parse_season(season, request))
        if season.tmdb_last_update and season.tmdb_last_update <= timezone.now() - SEASON_DETAILS_REFRESH_INTERVAL:
            response.add_post_render_callback(
                lambda _: enqueue_season_refresh(show.tmdb_id, season.tmdb_season_number)
            )
        return response

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'score': openapi.Schema(type=openapi.TYPE_INTEGER),
                'review': openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        responses={
            200: openapi.Response('OK'),
            400: openapi.Response('Bad Request'),
            404: openapi.Response('Show or Season Not Found'),
        }
    )
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
            season = Season.objects.select_related('tmdb_show').get(
                tmdb_show__tmdb_id=show_id,
                tmdb_season_number=season_number
            )
            show = season.tmdb_show
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
            user_episodes = UserEpisode.objects.select_related('episode').filter(user=request.user,
                                                                                 episode__tmdb_season=season)
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



def parse_season(season, request):
    episodes = [{
        'id': episode.tmdb_id,
        'name': episode.tmdb_name,
        'overview': episode.tmdb_overview,
        'air_date': format_date(episode.tmdb_release_date),
        'episode_number': episode.tmdb_episode_number,
        'runtime': episode.tmdb_runtime,
        'score': episode.tmdb_score,
        'still_path': get_proxy_url(request, episode.tmdb_still_path),
        'season_number': season.tmdb_season_number,
    } for episode in season.episode_set.order_by('tmdb_episode_number').all()]

    cast_names = [season_person.person.name for season_person in season.seasonperson_set.select_related('person')
                  .filter(role=SeasonPerson.ROLE_ACTOR).order_by('sort_order')]
    director_names = [season_person.person.name for season_person in season.seasonperson_set.select_related('person')
                      .filter(role=SeasonPerson.ROLE_DIRECTOR).order_by('sort_order')]

    return {
        'id': season.tmdb_id,
        'name': season.tmdb_name,
        'overview': season.tmdb_overview,
        'poster_path': get_proxy_url(request, season.tmdb_poster_path),
        'air_date': format_date(season.tmdb_air_date),
        'season_number': season.tmdb_season_number,
        'show': ShowSerializer(season.tmdb_show, context={'request': request}).data,
        'episodes': episodes,
        'cast': ', '.join(cast_names),
        'directors': ', '.join(director_names),
    }


def enqueue_season_refresh(show_tmdb_id, season_number):
    try:
        refresh_season_details.delay(show_tmdb_id, season_number)
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
