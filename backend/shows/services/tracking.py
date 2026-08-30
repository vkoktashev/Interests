from django.db import transaction

from shows.models import Episode, EpisodeLog, Show, ShowLog, UserEpisode, UserShow
from shows.serializers import UserEpisodeSerializer, UserShowWriteSerializer
from utils.constants import EPISODE_NOT_WATCHED_SCORE, EPISODE_WATCHED_SCORE


class ShowNotFoundError(Exception):
    pass


class InvalidEpisodesError(Exception):
    pass


@transaction.atomic
def update_user_show(user, tmdb_id, data):
    try:
        show = Show.objects.get(tmdb_id=tmdb_id)
    except Show.DoesNotExist as error:
        raise ShowNotFoundError from error

    serializer_data = data.copy()
    serializer_data.update({'user': user.pk, 'show': show.pk})
    user_show = UserShow.objects.filter(user=user, show=show).first()
    serializer = UserShowWriteSerializer(user_show, data=serializer_data) \
        if user_show is not None else UserShowWriteSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return serializer.data


@transaction.atomic
def update_user_episodes(user, show_tmdb_id, episode_payloads):
    try:
        show = Show.objects.get(tmdb_id=show_tmdb_id)
    except Show.DoesNotExist as error:
        raise ShowNotFoundError from error

    if not isinstance(episode_payloads, list):
        raise InvalidEpisodesError

    normalized_payloads = []
    episode_ids = []
    for payload in episode_payloads:
        if not isinstance(payload, dict) or payload.get('tmdb_id') is None:
            raise InvalidEpisodesError

        try:
            episode_ids.append(int(payload['tmdb_id']))
        except (TypeError, ValueError) as error:
            raise InvalidEpisodesError from error
        normalized_payload = {}
        if payload.get('score') is not None:
            normalized_payload['score'] = payload['score']
        if payload.get('review') is not None:
            normalized_payload['review'] = payload['review']
        normalized_payloads.append(normalized_payload)

    serializer = UserEpisodeSerializer(data=normalized_payloads, many=True)
    serializer.is_valid(raise_exception=True)

    episodes = list(Episode.objects.filter(
        tmdb_id__in=episode_ids,
        tmdb_season__tmdb_show=show,
    ))
    if len(episodes) != len(episode_ids):
        raise InvalidEpisodesError

    episodes_by_tmdb_id = {episode.tmdb_id: episode for episode in episodes}
    user_episodes_by_episode_id = {
        user_episode.episode_id: user_episode
        for user_episode in UserEpisode.objects.filter(
            user=user,
            episode__in=episodes,
        )
    }

    existing_to_update = []
    new_to_create = []
    watched_logs = []
    not_watched_logs = []

    for tmdb_id, validated_data in zip(episode_ids, serializer.validated_data):
        episode = episodes_by_tmdb_id[tmdb_id]
        user_episode = user_episodes_by_episode_id.get(episode.id)
        old_score = user_episode.score if user_episode is not None else EPISODE_NOT_WATCHED_SCORE
        old_review = user_episode.review if user_episode is not None else ''
        new_score = validated_data.get('score', old_score)
        new_review = validated_data.get('review', old_review)

        if user_episode is None:
            user_episode = UserEpisode(
                user=user,
                episode=episode,
                score=new_score,
                review=new_review,
            )
            new_to_create.append(user_episode)
        else:
            user_episode.score = new_score
            user_episode.review = new_review
            existing_to_update.append(user_episode)

        if old_review != new_review:
            EpisodeLog.objects.create(
                user=user,
                episode=episode,
                action_type=EpisodeLog.ACTION_TYPE_REVIEW,
                action_result=new_review,
            )

        if old_score == EPISODE_NOT_WATCHED_SCORE and new_score == EPISODE_WATCHED_SCORE:
            watched_logs.append(EpisodeLog(
                user=user,
                episode=episode,
                action_type=EpisodeLog.ACTION_TYPE_SCORE,
                action_result=new_score,
            ))
        elif old_score != EPISODE_NOT_WATCHED_SCORE and new_score == EPISODE_NOT_WATCHED_SCORE:
            not_watched_logs.append(EpisodeLog(
                user=user,
                episode=episode,
                action_type=EpisodeLog.ACTION_TYPE_SCORE,
                action_result=new_score,
            ))
        elif old_score != new_score:
            EpisodeLog.objects.create(
                user=user,
                episode=episode,
                action_type=EpisodeLog.ACTION_TYPE_SCORE,
                action_result=new_score,
            )

    _save_score_logs(user, show, watched_logs, not_watched_logs)
    if existing_to_update:
        UserEpisode.objects.bulk_update(existing_to_update, fields=('review', 'score'))
    if new_to_create:
        UserEpisode.objects.bulk_create(new_to_create)


@transaction.atomic
def complete_show(user, show_tmdb_id):
    try:
        show = Show.objects.get(tmdb_id=show_tmdb_id)
    except Show.DoesNotExist as error:
        raise ShowNotFoundError from error

    episodes = list(
        Episode.objects
        .filter(tmdb_season__tmdb_show=show)
        .exclude(tmdb_season__tmdb_season_number=0)
    )
    user_episodes_by_episode_id = {
        user_episode.episode_id: user_episode
        for user_episode in UserEpisode.objects.filter(user=user, episode__in=episodes)
    }

    existing_to_update = []
    new_to_create = []
    watched_logs = []
    for episode in episodes:
        user_episode = user_episodes_by_episode_id.get(episode.id)
        previous_score = user_episode.score if user_episode is not None else EPISODE_NOT_WATCHED_SCORE

        if user_episode is None:
            new_to_create.append(UserEpisode(
                user=user,
                episode=episode,
                score=EPISODE_WATCHED_SCORE,
            ))
        else:
            if user_episode.score == EPISODE_NOT_WATCHED_SCORE:
                user_episode.score = EPISODE_WATCHED_SCORE
            existing_to_update.append(user_episode)

        if previous_score == EPISODE_NOT_WATCHED_SCORE:
            watched_logs.append(EpisodeLog(
                user=user,
                episode=episode,
                action_type=EpisodeLog.ACTION_TYPE_SCORE,
                action_result=EPISODE_WATCHED_SCORE,
            ))

    _save_score_logs(user, show, watched_logs, [])
    if existing_to_update:
        UserEpisode.objects.bulk_update(existing_to_update, fields=('score',))
    if new_to_create:
        UserEpisode.objects.bulk_create(new_to_create)


def _save_score_logs(user, show, watched_logs, not_watched_logs):
    if len(watched_logs) > 1:
        ShowLog.objects.create(
            user=user,
            show=show,
            action_type=ShowLog.ACTION_TYPE_EPISODES,
            action_result=len(watched_logs),
        )
    elif watched_logs:
        watched_logs[0].save()

    if len(not_watched_logs) > 1:
        ShowLog.objects.create(
            user=user,
            show=show,
            action_type=ShowLog.ACTION_TYPE_EPISODES,
            action_result=-len(not_watched_logs),
        )
    elif not_watched_logs:
        not_watched_logs[0].save()
