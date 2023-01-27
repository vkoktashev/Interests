from datetime import datetime

from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError, ConnectionError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from shows.functions import get_show_new_fields
from shows.models import UserShow, Show, Episode, UserEpisode, EpisodeLog, ShowLog
from shows.serializers import UserShowSerializer, FollowedUserShowSerializer, UserEpisodeSerializer, ShowSerializer, \
    SeasonSerializer, EpisodeSerializer
from shows.tasks import update_all_shows_task
from shows.viewsets import get_tmdb_show, get_tmdb_show_videos, update_show_genres, parse_show
from users.models import UserFollow
from utils.constants import ERROR, SHOW_NOT_FOUND, TMDB_UNAVAILABLE, EPISODE_NOT_WATCHED_SCORE, EPISODE_WATCHED_SCORE
from utils.functions import update_fields_if_needed


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
