from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('games', '0070_game_video'),
        ('movies', '0032_movieperson_character'),
        ('shows', '0042_media_videos'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Collection',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('title', models.CharField(max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'author',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='collections',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'games',
                    models.ManyToManyField(
                        blank=True,
                        related_name='collections',
                        to='games.game',
                    ),
                ),
                (
                    'movies',
                    models.ManyToManyField(
                        blank=True,
                        related_name='collections',
                        to='movies.movie',
                    ),
                ),
                (
                    'shows',
                    models.ManyToManyField(
                        blank=True,
                        related_name='collections',
                        to='shows.show',
                    ),
                ),
            ],
            options={
                'verbose_name': 'подборка',
                'verbose_name_plural': 'подборки',
            },
        ),
    ]
