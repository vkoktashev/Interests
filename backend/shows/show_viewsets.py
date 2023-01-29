from datetime import datetime

import tmdbsimple as tmdb
from django.core.cache import cache
from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError, ConnectionError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import Genre
from proxy.functions import get_proxy_url
from shows.functions import get_tmdb_show_key, get_show_new_fields
from shows.models import Show, ShowGenre, UserShow, Episode, UserEpisode, EpisodeLog, ShowLog
from shows.serializers import ShowSerializer, UserShowSerializer, FollowedUserShowSerializer, UserEpisodeSerializer, \
    SeasonSerializer, EpisodeSerializer
from shows.tasks import update_all_shows_task
from users.models import UserFollow
from utils.constants import LANGUAGE, CACHE_TIMEOUT, YOUTUBE_PREFIX, TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, \
    ERROR, SHOW_NOT_FOUND, TMDB_UNAVAILABLE, EPISODE_NOT_WATCHED_SCORE, EPISODE_WATCHED_SCORE
from utils.functions import objects_to_str, update_fields_if_needed


def update_show_genres(show: Show, tmdb_show: dict) -> None:
    existing_show_genres = ShowGenre.objects.filter(show=show)
    new_show_genres = []
    show_genres_to_delete_ids = []

    for genre in tmdb_show.get('genres'):
        genre_obj, created = Genre.objects.get_or_create(tmdb_id=genre.get('id'),
                                                         defaults={
                                                             'tmdb_name': genre.get('name')
                                                         })
        show_genre_obj, created = ShowGenre.objects.get_or_create(genre=genre_obj, show=show)
        new_show_genres.append(show_genre_obj)

    for existing_show_genre in existing_show_genres:
        if existing_show_genre not in new_show_genres:
            show_genres_to_delete_ids.append(existing_show_genre.id)

    ShowGenre.objects.filter(id__in=show_genres_to_delete_ids).delete()


def user_watched_show(show, user):
    if show is None:
        return False

    user_show = UserShow.objects.filter(user=user, show=show).first()
    if user_show is not None and user_show.status != UserShow.STATUS_NOT_WATCHED:
        return True

    return False


def get_show_info(show_id, request):
    show = Show.objects.get(tmdb_id=show_id)
    show_data = ShowSerializer(show, context={'request': request}).data
    return {'show': show_data}


def get_tmdb_show(tmdb_id):
    returned_from_cache = True
    key = get_tmdb_show_key(tmdb_id)
    tmdb_show = cache.get(key, None)
    if tmdb_show is None:
        tmdb_show = tmdb.TV(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_show, CACHE_TIMEOUT)
        returned_from_cache = False
    return tmdb_show, returned_from_cache


def get_tmdb_show_videos(tmdb_id):
    key = f'show_{tmdb_id}_videos'
    tmdb_show_videos = cache.get(key, None)
    if tmdb_show_videos is None:
        tmdb_show_videos = tmdb.TV(tmdb_id).videos(language=LANGUAGE)['results']
        tmdb_show_videos = [x for x in tmdb_show_videos if x['site'] == 'YouTube']
        for index, video in enumerate(tmdb_show_videos):
            tmdb_show_videos[index] = {
                'name': video['name'],
                'url': YOUTUBE_PREFIX + video['key']
            }
        cache.set(key, tmdb_show_videos, CACHE_TIMEOUT)
    return tmdb_show_videos


def parse_show(tmdb_show, schema):
    new_show = {
        'id': tmdb_show.get('id'),
        'name': tmdb_show.get('name'),
        'original_name': tmdb_show.get('original_name'),
        'overview': tmdb_show.get('overview'),
        'episode_run_time': tmdb_show['episode_run_time'][0] if len(tmdb_show['episode_run_time']) > 0 else 0,
        'seasons_count': tmdb_show.get('number_of_seasons'),
        'episodes_count': tmdb_show.get('number_of_episodes'),
        'score': int(tmdb_show['vote_average'] * 10) if tmdb_show.get('vote_average') is not None else None,
        'backdrop_path': get_proxy_url(schema, TMDB_BACKDROP_PATH_PREFIX, tmdb_show.get('backdrop_path')),
        'poster_path': get_proxy_url(schema, TMDB_POSTER_PATH_PREFIX, tmdb_show.get('poster_path')),
        'genres': objects_to_str(tmdb_show['genres']),
        'production_companies': objects_to_str(tmdb_show['production_companies']),
        'status': translate_tmdb_status(tmdb_show['status']),
        'first_air_date': '.'.join(reversed(tmdb_show['first_air_date'].split('-')))
        if tmdb_show.get('first_air_date') is not None else None,
        'last_air_date': '.'.join(reversed(tmdb_show['last_air_date'].split('-')))
        if tmdb_show.get('last_air_date') is not None else None,
        'videos': tmdb_show.get('videos'),
        'seasons': tmdb_show['seasons'],
    }

    return new_show


def translate_tmdb_status(tmdb_status):
    for choice in Show.TMDB_STATUS_CHOICES:
        if tmdb_status in choice:
            return choice[1]
    return tmdb_status


class ShowViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserShow.objects.all()
    serializer_class = UserShowSerializer
    lookup_field = 'tmdb_id'

    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_show, returned_from_cache = get_tmdb_show(kwargs.get('tmdb_id'))
            tmdb_show['videos'] = get_tmdb_show_videos(kwargs.get('tmdb_id'))
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        new_fields = get_show_new_fields(tmdb_show)

        show, created = Show.objects.filter().get_or_create(tmdb_id=tmdb_show['id'],
                                                            defaults=new_fields)
        if not created and not returned_from_cache:
            update_fields_if_needed(show, new_fields)

        if created or not returned_from_cache:
            update_show_genres(show, tmdb_show)

        return Response(parse_show(tmdb_show, request.scheme))

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

            user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
            followed_user_shows = UserShow.objects.select_related('user') \
                .exclude(status=UserShow.STATUS_NOT_WATCHED) \
                .filter(user__in=user_follow_query, show=show)
            serializer = FollowedUserShowSerializer(followed_user_shows, many=True)
            friends_info = serializer.data
        except (Show.DoesNotExist, ValueError):
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

    @action(detail=True, methods=['put'])
    def episodes(self, request, *args, **kwargs):
        episodes = request.data.get('episodes')
        first_watched_episode_log = None
        first_not_watched_episode_log = None
        watched_episodes_count = 0
        not_watched_episodes_count = 0

        try:
            show = Show.objects.get(tmdb_id=kwargs.get('tmdb_id'))
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        episode_list = Episode.objects \
            .filter(tmdb_id__in=[episode.pop('tmdb_id') for episode in episodes], tmdb_season__tmdb_show=show)

        if len(episode_list) != len(episodes):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        user_episodes = UserEpisode.objects.select_related('episode__tmdb_season__tmdb_show') \
            .select_related('episode') \
            .select_related('user') \
            .filter(user=request.user, episode__in=episode_list)

        existed_user_episodes = []
        existed_user_episodes_data = []
        new_user_episodes = []
        new_user_episodes_data = []

        for i, data in enumerate(episodes):
            episode = episode_list[i]

            data.update({
                'user': request.user,
                'episode': episode,
                'review': data.get('review'),
                'score': data.get('score')
            })

            found = False
            current_user_episode = None
            for user_episode in user_episodes:
                if episode == user_episode.episode:
                    current_user_episode = user_episode
                    found = True
                    break

            if found:
                current_user_episode_score = current_user_episode.score
                current_user_episode_review = current_user_episode.review
                if data.get('review') is None:
                    data.update({'review': current_user_episode_review})
                if data.get('score') is None:
                    data.update({'score': current_user_episode_score})
                update_fields_if_needed(current_user_episode, data, need_save=False)
                existed_user_episodes.append(current_user_episode)
                existed_user_episodes_data.append(data)

            else:
                current_user_episode_score = EPISODE_NOT_WATCHED_SCORE
                current_user_episode_review = ''
                if data.get('review') is None:
                    data.update({'review': current_user_episode_review})
                if data.get('score') is None:
                    data.update({'score': current_user_episode_score})
                new_user_episodes.append(
                    UserEpisode(**data)
                )
                new_user_episodes_data.append(data)

            if current_user_episode is not None and current_user_episode_review != data.get('review') or \
                    current_user_episode is None and data.get('review') != '':
                EpisodeLog.objects.create(user=request.user, episode=episode,
                                          action_type=EpisodeLog.ACTION_TYPE_REVIEW, action_result=data.get('review'))

            if current_user_episode_score == EPISODE_NOT_WATCHED_SCORE and \
                    data.get('score') == EPISODE_WATCHED_SCORE:
                if watched_episodes_count == 0:
                    if current_user_episode is not None and current_user_episode_score != data.get('score') or \
                            current_user_episode is None and data.get('score') != EPISODE_NOT_WATCHED_SCORE:
                        first_watched_episode_log = EpisodeLog(user=request.user, episode=episode,
                                                               action_type=EpisodeLog.ACTION_TYPE_SCORE,
                                                               action_result=data.get('score'))
                watched_episodes_count += 1

            elif current_user_episode_score != EPISODE_NOT_WATCHED_SCORE and \
                    data.get('score') == EPISODE_NOT_WATCHED_SCORE:
                if not_watched_episodes_count == 0:
                    if current_user_episode is not None:
                        first_not_watched_episode_log = EpisodeLog(user=request.user, episode=episode,
                                                                   action_type=EpisodeLog.ACTION_TYPE_SCORE,
                                                                   action_result=data.get('score'))
                not_watched_episodes_count += 1

            elif current_user_episode is not None and current_user_episode_score != data.get('score') or \
                    current_user_episode is None and data.get('score') != EPISODE_NOT_WATCHED_SCORE:
                EpisodeLog.objects.create(user=request.user, episode=episode,
                                          action_type=EpisodeLog.ACTION_TYPE_SCORE, action_result=data.get('score'))

        if watched_episodes_count > 1:
            ShowLog.objects.create(user=request.user, show=show,
                                   action_type=ShowLog.ACTION_TYPE_EPISODES, action_result=watched_episodes_count)
        elif watched_episodes_count == 1 and first_watched_episode_log is not None:
            first_watched_episode_log.save()

        if not_watched_episodes_count > 1:
            ShowLog.objects.create(user=request.user, show=show,
                                   action_type=ShowLog.ACTION_TYPE_EPISODES, action_result=-not_watched_episodes_count)
        elif not_watched_episodes_count == 1 and first_not_watched_episode_log is not None:
            first_not_watched_episode_log.save()

        serializer = UserEpisodeSerializer(data=existed_user_episodes_data, many=True)
        serializer.is_valid(raise_exception=True)
        UserEpisode.objects.bulk_update(existed_user_episodes, fields=('review', 'score'))

        serializer = UserEpisodeSerializer(data=new_user_episodes_data, many=True)
        serializer.is_valid(raise_exception=True)
        UserEpisode.objects.bulk_create(new_user_episodes)

        return Response(status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def unwatched_episodes(self, request):
        today_date = datetime.today().date()

        shows = Show.objects.filter(Q(usershow__user=request.user) &
                                    (Q(usershow__status=UserShow.STATUS_WATCHING) |
                                     Q(usershow__status=UserShow.STATUS_WATCHED)))

        episodes = Episode.objects.select_related('tmdb_season', 'tmdb_season__tmdb_show') \
            .filter(tmdb_season__tmdb_show__in=shows, tmdb_release_date__lte=today_date) \
            .exclude(userepisode__in=UserEpisode.objects.filter(score__gt=-1, user=request.user)) \
            .exclude(tmdb_season__tmdb_season_number=0) \
            .order_by('tmdb_season__tmdb_season_number', 'tmdb_episode_number')

        shows_info = []

        for episode in episodes:
            show = episode.tmdb_season.tmdb_show
            show_index = -1

            season = episode.tmdb_season
            season_index = -1

            show_found = False
            for element in shows_info:
                if show.id == element['id']:
                    show_found = True
                    show_index = shows_info.index(element)
                    break

            if not show_found:
                show_data = ShowSerializer(show, context={'request': request}).data
                show_data.update({'seasons': []})
                shows_info.append(show_data)

            season_found = False
            for element in shows_info[show_index]['seasons']:
                if season.id == element['id']:
                    season_found = True
                    season_index = shows_info[show_index]['seasons'].index(element)
                    break

            if not season_found:
                season_data = SeasonSerializer(season).data
                season_data.update({'episodes': []})
                shows_info[show_index]['seasons'].append(season_data)

            show_episodes = shows_info[show_index]['seasons'][season_index]['episodes']
            show_episodes.append(EpisodeSerializer(episode).data)

        return Response(shows_info)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def update_all_shows(self, request):
        start_index = int(request.GET.get('start_index', 0))
        update_all_shows_task.delay(start_index)
        return Response()
