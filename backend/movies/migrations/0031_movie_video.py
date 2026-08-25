from django.db import migrations, models
import django.db.models.deletion


def is_legacy_trailer(name):
    normalized_name = (name or '').casefold()
    return 'trailer' in normalized_name or 'трейлер' in normalized_name


def migrate_movie_videos(apps, schema_editor):
    Movie = apps.get_model('movies', 'Movie')
    MovieVideo = apps.get_model('movies', 'MovieVideo')
    Video = apps.get_model('videos', 'Video')

    for movie in Movie.objects.only('id', 'tmdb_videos').iterator(chunk_size=500):
        for sort_order, legacy_video in enumerate(movie.tmdb_videos or []):
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
            MovieVideo.objects.get_or_create(
                movie_id=movie.id,
                video_id=video.id,
                defaults={'sort_order': sort_order},
            )


def restore_movie_videos(apps, schema_editor):
    Movie = apps.get_model('movies', 'Movie')
    MovieVideo = apps.get_model('movies', 'MovieVideo')

    for movie in Movie.objects.only('id').iterator(chunk_size=500):
        videos = [
            {'name': relation.video.name, 'url': relation.video.url}
            for relation in MovieVideo.objects.filter(movie_id=movie.id).select_related('video')
            .order_by('sort_order', 'id')
        ]
        Movie.objects.filter(id=movie.id).update(tmdb_videos=videos)


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0030_movie_tmdb_original_language'),
        ('videos', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MovieVideo',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('movie', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='movies.movie')),
                ('video', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='videos.video')),
            ],
            options={
                'verbose_name': 'видео фильма',
                'verbose_name_plural': 'видео фильмов',
                'ordering': ('sort_order', 'id'),
                'unique_together': {('movie', 'video')},
            },
        ),
        migrations.AddField(
            model_name='movie',
            name='videos',
            field=models.ManyToManyField(related_name='movies', through='movies.MovieVideo', to='videos.video'),
        ),
        migrations.RunPython(migrate_movie_videos, restore_movie_videos),
        migrations.RemoveField(
            model_name='movie',
            name='tmdb_videos',
        ),
    ]
