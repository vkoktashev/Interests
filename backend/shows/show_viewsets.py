from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError, ConnectionError, Timeout
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from shows.functions import get_show_new_fields, get_tmdb_show, get_tmdb_show_videos, get_tmdb_show_credits, \
    sync_show_genres, sync_show_people, upsert_season_from_tmdb, get_tmdb_show_reviews, get_tmdb_show_recommendations
from shows.models import Show, UserShow, Episode, UserEpisode, EpisodeLog, ShowLog, ShowPerson
from shows.serializers import ShowSerializer, UserShowReadSerializer, FollowedUserShowSerializer, UserEpisodeSerializer, \
    SeasonSerializer, EpisodeSerializer, UserShowWriteSerializer
from shows.tasks import update_shows, update_all_shows_task, refresh_show_details
from users.models import UserFollow
from utils.constants import ERROR, SHOW_NOT_FOUND, TMDB_UNAVAILABLE, EPISODE_NOT_WATCHED_SCORE, EPISODE_WATCHED_SCORE, \
    TMDB_POSTER_PATH_PREFIX, TMDB_BACKDROP_PATH_PREFIX
from utils.functions import update_fields_if_needed

SHOW_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)


class ShowViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserShow.objects.all()
    serializer_class = UserShowReadSerializer
    lookup_field = 'tmdb_id'

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Not Found'),
            503: openapi.Response('Service Unavailable'),
        }
    )
    def retrieve(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        show = Show.objects.filter(tmdb_id=tmdb_id).first()

        seasons_count_in_db = show.season_set.count() if show is not None else 0
        expected_seasons_count = (show.tmdb_number_of_seasons or 0) if show is not None else 0
        has_missing_seasons = (
            show is not None and
            expected_seasons_count > 0 and
            seasons_count_in_db < expected_seasons_count
        )
        should_fetch_from_tmdb = show is None or show.tmdb_last_update is None or has_missing_seasons

        if should_fetch_from_tmdb:
            try:
                tmdb_show = get_tmdb_show(tmdb_id)
                tmdb_show_videos = get_tmdb_show_videos(tmdb_id)
                tmdb_show_credits = get_tmdb_show_credits(tmdb_id)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except ConnectionError:
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            new_fields = get_show_new_fields(tmdb_show, tmdb_show_videos)
            show, created = Show.objects.filter().get_or_create(tmdb_id=tmdb_show.get('id'), defaults=new_fields)
            if not created:
                update_fields_if_needed(show, new_fields)

            sync_show_genres(show, tmdb_show)
            sync_show_people(show, tmdb_show_credits)

            for tmdb_season in tmdb_show.get('seasons') or []:
                upsert_season_from_tmdb(show, tmdb_season)

        response = Response(parse_show(show, request))

        if show.tmdb_last_update and show.tmdb_last_update <= timezone.now() - SHOW_DETAILS_REFRESH_INTERVAL:
            show_id = show.tmdb_id
            response.add_post_render_callback(lambda _: enqueue_show_refresh(show_id))

        return response

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'status': openapi.Schema(type=openapi.TYPE_STRING,
                                         enum=[UserShow.STATUS_WATCHED, UserShow.STATUS_STOPPED,
                                               UserShow.STATUS_GOING, UserShow.STATUS_NOT_WATCHED,
                                               UserShow.STATUS_WATCHING]),
                'score': openapi.Schema(type=openapi.TYPE_INTEGER),
                'review': openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Not Found'),
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
            serializer = UserShowWriteSerializer(user_show, data=data)
        except UserShow.DoesNotExist:
            serializer = UserShowWriteSerializer(data=data)

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

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Show not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def tmdb_reviews(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        try:
            page = int(request.query_params.get('page', 1) or 1)
        except (TypeError, ValueError):
            page = 1
        page = max(page, 1)

        try:
            payload = get_tmdb_show_reviews(tmdb_id, page=page)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (ConnectionError, Timeout, ValueError):
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        reviews = []
        for item in (payload.get('results') or []):
            author_details = item.get('author_details') or {}
            avatar_path = author_details.get('avatar_path') or ''
            if isinstance(avatar_path, str) and avatar_path.startswith('/http'):
                avatar_path = avatar_path[1:]

            reviews.append({
                'id': item.get('id'),
                'author': item.get('author') or author_details.get('username') or 'TMDB user',
                'username': author_details.get('username') or '',
                'rating': author_details.get('rating'),
                'avatar_path': avatar_path,
                'content': item.get('content') or '',
                'created_at': item.get('created_at'),
                'updated_at': item.get('updated_at'),
                'url': item.get('url') or '',
            })

        return Response({
            'page': payload.get('page') or page,
            'total_pages': payload.get('total_pages') or 1,
            'total_results': payload.get('total_results') or len(reviews),
            'results': reviews,
        })

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Show not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def tmdb_recommendations(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        try:
            page = int(request.query_params.get('page', 1) or 1)
        except (TypeError, ValueError):
            page = 1
        page = max(page, 1)

        try:
            payload = get_tmdb_show_recommendations(tmdb_id, page=page)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (ConnectionError, Timeout, ValueError):
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        recommendations = []
        for item in (payload.get('results') or []):
            recommendations.append({
                'id': item.get('id'),
                'name': item.get('name') or '',
                'original_name': item.get('original_name') or '',
                'overview': item.get('overview') or '',
                'release_date': item.get('first_air_date') or '',
                'vote_average': item.get('vote_average'),
                'vote_count': item.get('vote_count') or 0,
                'poster_path': get_proxy_url(request, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
                'backdrop_path': get_proxy_url(request, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
            })

        return Response({
            'page': payload.get('page') or page,
            'total_pages': payload.get('total_pages') or 1,
            'total_results': payload.get('total_results') or len(recommendations),
            'results': recommendations,
        })

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                'tmdb_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                'score': openapi.Schema(type=openapi.TYPE_INTEGER)
            })
        ),
        responses={
            200: openapi.Response('OK'),
            400: openapi.Response('Bad Request'),
            404: openapi.Response('Show Not Found'),
        }
    )
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
            .filter(tmdb_id__in=[episode['tmdb_id'] for episode in episodes], tmdb_season__tmdb_show=show)

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
            episode = next((x for x in episode_list if x.tmdb_id == data['tmdb_id']))
            data.pop('tmdb_id')

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

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Show Not Found'),
        }
    )
    @action(detail=True, methods=['put'])
    def complete(self, request, *args, **kwargs):
        first_watched_episode_log = None
        watched_episodes_count = 0

        try:
            show = Show.objects.get(tmdb_id=kwargs.get('tmdb_id'))
        except Show.DoesNotExist:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        episode_list = Episode.objects.filter(tmdb_season__tmdb_show=show).exclude(tmdb_season__tmdb_season_number=0)

        user_episodes = UserEpisode.objects.select_related('episode__tmdb_season__tmdb_show') \
            .select_related('episode') \
            .select_related('user') \
            .filter(user=request.user, episode__in=episode_list)

        existed_user_episodes = []
        new_user_episodes = []

        for episode in episode_list:
            found = False
            current_user_episode = None
            for user_episode in user_episodes:
                if episode == user_episode.episode:
                    current_user_episode = user_episode
                    found = True
                    break

            if found:
                previous_score = current_user_episode.score
                if current_user_episode.score == EPISODE_NOT_WATCHED_SCORE:
                    current_user_episode.score = EPISODE_WATCHED_SCORE
                existed_user_episodes.append(current_user_episode)

            else:
                previous_score = EPISODE_NOT_WATCHED_SCORE
                new_user_episodes.append(
                    UserEpisode(user=request.user, episode=episode, score=EPISODE_WATCHED_SCORE)
                )

            if previous_score == EPISODE_NOT_WATCHED_SCORE:
                watched_episodes_count += 1
                if watched_episodes_count == 1:
                    first_watched_episode_log = EpisodeLog(user=request.user, episode=episode,
                                                           action_type=EpisodeLog.ACTION_TYPE_SCORE,
                                                           action_result=EPISODE_WATCHED_SCORE)

        if watched_episodes_count > 1:
            ShowLog.objects.create(user=request.user, show=show,
                                   action_type=ShowLog.ACTION_TYPE_EPISODES, action_result=watched_episodes_count)
        elif watched_episodes_count == 1 and first_watched_episode_log is not None:
            first_watched_episode_log.save()

        UserEpisode.objects.bulk_update(existed_user_episodes, fields=('score',))
        UserEpisode.objects.bulk_create(new_user_episodes)

        return Response(status=status.HTTP_200_OK)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER,
                              description='Page number for pagination'),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER,
                              description='Number of episodes per page'),
        ],
        responses={
            200: openapi.Response('OK'),
            401: openapi.Response('Unauthorized'),
        }
    )
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
                if show.tmdb_id == element['tmdb_id']:
                    show_found = True
                    show_index = shows_info.index(element)
                    break

            if not show_found:
                show_data = ShowSerializer(show, context={'request': request}).data
                show_data.update({'seasons': []})
                shows_info.append(show_data)
                show_index = len(shows_info) - 1

            season_found = False
            for element in shows_info[show_index]['seasons']:
                if season.tmdb_id == element['tmdb_id']:
                    season_found = True
                    season_index = shows_info[show_index]['seasons'].index(element)
                    break

            if not season_found:
                season_data = SeasonSerializer(season).data
                season_data.update({'episodes': []})
                shows_info[show_index]['seasons'].append(season_data)
                season_index = len(shows_info[show_index]['seasons']) - 1

            show_episodes = shows_info[show_index]['seasons'][season_index]['episodes']
            show_episodes.append(EpisodeSerializer(episode).data)

        return Response(shows_info)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('start_index', openapi.IN_QUERY, type=openapi.TYPE_INTEGER,
                              description='Index to start the update from', default=0)
        ],
        responses={
            200: openapi.Response('OK')
        },
        operation_description="This operation is potentially dangerous and may take a long time."
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def update_all_shows(self, request):
        start_index = int(request.GET.get('start_index', 0))
        update_all_shows_task.delay(start_index)
        return Response()

    @swagger_auto_schema(
        responses={
            200: openapi.Response('OK')
        },
        operation_description="This operation is potentially dangerous and may take a long time."
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def update_shows(self, request):
        update_shows()
        return Response()


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


def parse_show(show, request):
    genres = [show_genre.genre.tmdb_name for show_genre in show.showgenre_set.select_related('genre').all()]
    cast_names = [show_person.person.name for show_person in show.showperson_set.select_related('person')
                  .filter(role=ShowPerson.ROLE_ACTOR).order_by('sort_order')]
    director_names = [show_person.person.name for show_person in show.showperson_set.select_related('person')
                      .filter(role=ShowPerson.ROLE_DIRECTOR).order_by('sort_order')]
    seasons = [{
        'id': season.tmdb_id,
        'name': season.tmdb_name,
        'overview': season.tmdb_overview,
        'poster_path': get_proxy_url(request, season.tmdb_poster_path),
        'air_date': season.tmdb_air_date.strftime('%d.%m.%Y') if season.tmdb_air_date else None,
        'season_number': season.tmdb_season_number,
    } for season in show.season_set.order_by('tmdb_season_number').all()]

    return {
        'id': show.tmdb_id,
        'name': show.tmdb_name,
        'original_name': show.tmdb_original_name,
        'overview': show.tmdb_overview,
        'episode_run_time': show.tmdb_episode_runtime,
        'seasons_count': show.tmdb_number_of_seasons,
        'episodes_count': show.tmdb_number_of_episodes,
        'score': show.tmdb_score,
        'backdrop_path': get_proxy_url(request, show.tmdb_backdrop_path),
        'poster_path': get_proxy_url(request, show.tmdb_poster_path),
        'genres': ', '.join(genres),
        'production_companies': show.tmdb_production_companies,
        'status': translate_tmdb_status(show.tmdb_status),
        'first_air_date': format_date(show.tmdb_release_date),
        'last_air_date': format_date(show.tmdb_last_air_date),
        'videos': show.tmdb_videos,
        'seasons': seasons,
        'cast': ', '.join(cast_names),
        'directors': ', '.join(director_names),
    }


def translate_tmdb_status(tmdb_status):
    for choice in Show.TMDB_STATUS_CHOICES:
        if tmdb_status in choice:
            return choice[1]
    return tmdb_status


def enqueue_show_refresh(tmdb_id):
    try:
        refresh_show_details.delay(tmdb_id)
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
