from django.db import migrations, models
import django.db.models.deletion


def copy_publishers_to_separate_relations(apps, schema_editor):
    GameDeveloper = apps.get_model('games', 'GameDeveloper')
    GamePublisher = apps.get_model('games', 'GamePublisher')
    publisher_links = GameDeveloper.objects.filter(developer__is_publisher=True)
    GamePublisher.objects.bulk_create(
        [
            GamePublisher(
                game_id=link.game_id,
                publisher_id=link.developer_id,
                sort_order=link.sort_order,
            )
            for link in publisher_links.iterator()
        ],
        ignore_conflicts=True,
    )


def clear_publisher_relations(apps, schema_editor):
    GamePublisher = apps.get_model('games', 'GamePublisher')
    GamePublisher.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0073_game_igdb_game_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='GamePublisher',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='games.game')),
                ('publisher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='people.developer')),
            ],
            options={
                'verbose_name': 'издатель игры',
                'verbose_name_plural': 'издатели игр',
                'unique_together': {('game', 'publisher')},
            },
        ),
        migrations.RunPython(copy_publishers_to_separate_relations, clear_publisher_relations),
    ]
