import django.db.models.constraints
from django.conf import settings
from django.db import migrations, models
from django.db.models import Count


def merge_duplicate_episodes(apps, schema_editor):
    Episode = apps.get_model('shows', 'Episode')
    EpisodeLog = apps.get_model('shows', 'EpisodeLog')
    EpisodePerson = apps.get_model('shows', 'EpisodePerson')
    EpisodeVideo = apps.get_model('shows', 'EpisodeVideo')
    UserEpisode = apps.get_model('shows', 'UserEpisode')

    duplicate_groups = Episode.objects.values(
        'tmdb_season_id',
        'tmdb_episode_number',
    ).annotate(count=Count('id')).filter(count__gt=1)

    for group in duplicate_groups.iterator():
        episodes = list(Episode.objects.filter(
            tmdb_season_id=group['tmdb_season_id'],
            tmdb_episode_number=group['tmdb_episode_number'],
        ).order_by('id'))
        canonical = max(episodes, key=lambda episode: (
            UserEpisode.objects.filter(episode_id=episode.id).count()
            + EpisodeLog.objects.filter(episode_id=episode.id).count(),
            episode.tmdb_last_update.timestamp() if episode.tmdb_last_update else 0,
            -episode.id,
        ))

        for duplicate in episodes:
            if duplicate.id == canonical.id:
                continue
            _merge_episode_fields(canonical, duplicate)
            _move_user_episodes(UserEpisode, canonical, duplicate)
            EpisodeLog.objects.filter(episode_id=duplicate.id).update(episode_id=canonical.id)
            _move_unique_relations(
                EpisodePerson,
                canonical,
                duplicate,
                identity_fields=('person_id', 'role'),
            )
            _move_unique_relations(
                EpisodeVideo,
                canonical,
                duplicate,
                identity_fields=('video_id',),
            )
            duplicate.delete()


def _merge_episode_fields(canonical, duplicate):
    update_fields = []
    for field in (
        'tmdb_name',
        'tmdb_release_date',
        'tmdb_runtime',
        'tmdb_overview',
        'tmdb_score',
        'tmdb_still_path',
        'tmdb_last_update',
    ):
        if getattr(canonical, field) in (None, '', 0) and getattr(duplicate, field) not in (None, '', 0):
            setattr(canonical, field, getattr(duplicate, field))
            update_fields.append(field)
    if update_fields:
        canonical.save(update_fields=update_fields)


def _move_user_episodes(UserEpisode, canonical, duplicate):
    for user_episode in UserEpisode.objects.filter(episode_id=duplicate.id).iterator():
        existing = UserEpisode.objects.filter(
            user_id=user_episode.user_id,
            episode_id=canonical.id,
        ).first()
        if existing is None:
            user_episode.episode_id = canonical.id
            user_episode.save(update_fields=('episode',))
            continue

        update_fields = []
        if existing.score == -1 and user_episode.score != -1:
            existing.score = user_episode.score
            update_fields.append('score')
        if not existing.review and user_episode.review:
            existing.review = user_episode.review
            update_fields.append('review')
        if update_fields:
            existing.save(update_fields=update_fields)
        user_episode.delete()


def _move_unique_relations(model, canonical, duplicate, identity_fields):
    for relation in model.objects.filter(episode_id=duplicate.id).iterator():
        identity = {field: getattr(relation, field) for field in identity_fields}
        existing = model.objects.filter(episode_id=canonical.id, **identity).first()
        if existing is None:
            relation.episode_id = canonical.id
            relation.save(update_fields=('episode',))
        else:
            if relation.sort_order < existing.sort_order:
                existing.sort_order = relation.sort_order
                existing.save(update_fields=('sort_order',))
            relation.delete()


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('shows', '0043_showperson_character_episode_count'),
        ('videos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(
            merge_duplicate_episodes,
            migrations.RunPython.noop,
            atomic=True,
        ),
        migrations.AddConstraint(
            model_name='episode',
            constraint=models.UniqueConstraint(
                deferrable=django.db.models.constraints.Deferrable['DEFERRED'],
                fields=('tmdb_season', 'tmdb_episode_number'),
                name='unique_season_episode_number',
            ),
        ),
        migrations.AddConstraint(
            model_name='userepisode',
            constraint=models.CheckConstraint(
                condition=models.Q(score__gte=-1, score__lte=10),
                name='user_episode_score_between_minus_1_and_10',
            ),
        ),
        migrations.AddConstraint(
            model_name='userseason',
            constraint=models.CheckConstraint(
                condition=models.Q(score__gte=0, score__lte=10),
                name='user_season_score_between_0_and_10',
            ),
        ),
        migrations.AddConstraint(
            model_name='usershow',
            constraint=models.CheckConstraint(
                condition=models.Q(score__gte=0, score__lte=10),
                name='user_show_score_between_0_and_10',
            ),
        ),
    ]
