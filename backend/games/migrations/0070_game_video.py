from django.db import migrations, models
import django.db.models.deletion


def migrate_game_videos(apps, schema_editor):
    GameTrailer = apps.get_model('games', 'GameTrailer')
    GameVideo = apps.get_model('games', 'GameVideo')
    Video = apps.get_model('videos', 'Video')

    game_trailers = GameTrailer.objects.order_by('game_id', 'sort_order', 'id').iterator(chunk_size=500)
    for game_trailer in game_trailers:
        url = game_trailer.url or ''
        if not url:
            continue

        video, _ = Video.objects.get_or_create(
            source='igdb',
            url=url,
            defaults={
                'external_id': str(game_trailer.igdb_id or ''),
                'name': game_trailer.name or '',
                'platform': 'YouTube' if 'youtube.com/' in url or 'youtu.be/' in url else '',
                'type': 'Trailer',
            },
        )
        GameVideo.objects.get_or_create(
            game_id=game_trailer.game_id,
            video_id=video.id,
            defaults={'sort_order': game_trailer.sort_order},
        )


def restore_game_trailers(apps, schema_editor):
    GameTrailer = apps.get_model('games', 'GameTrailer')
    GameVideo = apps.get_model('games', 'GameVideo')

    game_videos = GameVideo.objects.filter(video__source='igdb').select_related('video') \
        .order_by('game_id', 'sort_order', 'id').iterator(chunk_size=500)
    trailers = []
    for game_video in game_videos:
        video = game_video.video
        external_id = int(video.external_id) if video.external_id.isdigit() else None
        video_id = video.url.rsplit('v=', 1)[-1] if 'v=' in video.url else ''
        trailers.append(GameTrailer(
            game_id=game_video.game_id,
            igdb_id=external_id,
            igdb_video_id=video_id,
            name=video.name,
            url=video.url,
            sort_order=game_video.sort_order,
        ))

        if len(trailers) >= 500:
            GameTrailer.objects.bulk_create(trailers, batch_size=500)
            trailers = []

    if trailers:
        GameTrailer.objects.bulk_create(trailers, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0069_alter_gamebeattime_hours'),
        ('videos', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameVideo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.game')),
                ('video', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='videos.video')),
            ],
            options={
                'verbose_name': 'видео игры',
                'verbose_name_plural': 'видео игр',
                'ordering': ('sort_order', 'id'),
                'unique_together': {('game', 'video')},
            },
        ),
        migrations.AddField(
            model_name='game',
            name='videos',
            field=models.ManyToManyField(related_name='games', through='games.GameVideo', to='videos.video'),
        ),
        migrations.RunPython(migrate_game_videos, restore_game_trailers),
        migrations.DeleteModel(
            name='GameTrailer',
        ),
    ]
