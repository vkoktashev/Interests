from django.db import migrations, models
import django.db.models.deletion


def is_legacy_trailer(name):
    normalized_name = (name or '').casefold()
    return 'trailer' in normalized_name or 'трейлер' in normalized_name


def migrate_show_videos(apps, schema_editor):
    Show = apps.get_model('shows', 'Show')
    ShowVideo = apps.get_model('shows', 'ShowVideo')
    Video = apps.get_model('videos', 'Video')

    for show in Show.objects.only('id', 'tmdb_videos').iterator(chunk_size=500):
        for sort_order, legacy_video in enumerate(show.tmdb_videos or []):
            if not isinstance(legacy_video, dict):
                continue
            name = legacy_video.get('name') or ''
            if not is_legacy_trailer(name):
                continue
            url = legacy_video.get('url') or ''
            if not url:
                continue

            video, _ = Video.objects.get_or_create(
                source='tmdb',
                url=url,
                defaults={
                    'external_id': '',
                    'name': name,
                    'platform': 'YouTube' if 'youtube.com/' in url or 'youtu.be/' in url else '',
                    'type': 'Trailer',
                },
            )
            ShowVideo.objects.get_or_create(
                show_id=show.id,
                video_id=video.id,
                defaults={'sort_order': sort_order},
            )


def restore_show_videos(apps, schema_editor):
    Show = apps.get_model('shows', 'Show')
    ShowVideo = apps.get_model('shows', 'ShowVideo')

    for show in Show.objects.only('id').iterator(chunk_size=500):
        videos = [
            {'name': relation.video.name, 'url': relation.video.url}
            for relation in ShowVideo.objects.filter(show_id=show.id).select_related('video')
            .order_by('sort_order', 'id')
        ]
        Show.objects.filter(id=show.id).update(tmdb_videos=videos)


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0041_show_tmdb_original_language'),
        ('videos', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ShowVideo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('show', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.show')),
                ('video', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='videos.video')),
            ],
            options={
                'verbose_name': 'видео сериала',
                'verbose_name_plural': 'видео сериалов',
                'ordering': ('sort_order', 'id'),
                'unique_together': {('show', 'video')},
            },
        ),
        migrations.CreateModel(
            name='SeasonVideo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('season', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.season')),
                ('video', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='videos.video')),
            ],
            options={
                'verbose_name': 'видео сезона',
                'verbose_name_plural': 'видео сезонов',
                'ordering': ('sort_order', 'id'),
                'unique_together': {('season', 'video')},
            },
        ),
        migrations.CreateModel(
            name='EpisodeVideo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.episode')),
                ('video', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='videos.video')),
            ],
            options={
                'verbose_name': 'видео серии',
                'verbose_name_plural': 'видео серий',
                'ordering': ('sort_order', 'id'),
                'unique_together': {('episode', 'video')},
            },
        ),
        migrations.AddField(
            model_name='show',
            name='videos',
            field=models.ManyToManyField(related_name='shows', through='shows.ShowVideo', to='videos.video'),
        ),
        migrations.AddField(
            model_name='season',
            name='videos',
            field=models.ManyToManyField(related_name='seasons', through='shows.SeasonVideo', to='videos.video'),
        ),
        migrations.AddField(
            model_name='episode',
            name='videos',
            field=models.ManyToManyField(related_name='episodes', through='shows.EpisodeVideo', to='videos.video'),
        ),
        migrations.RunPython(migrate_show_videos, restore_show_videos),
        migrations.RemoveField(
            model_name='show',
            name='tmdb_videos',
        ),
    ]
