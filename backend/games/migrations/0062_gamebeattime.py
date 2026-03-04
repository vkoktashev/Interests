from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0061_make_rawg_id_slug_nullable'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameBeatTime',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('main', 'Main'), ('extra', 'Extra'), ('complete', 'Complete')], max_length=16)),
                ('source', models.CharField(choices=[('igdb', 'IGDB'), ('hltb', 'HLTB')], max_length=16)),
                ('hours', models.DecimalField(decimal_places=2, max_digits=6)),
                ('game', models.ForeignKey(on_delete=models.deletion.CASCADE, to='games.game')),
            ],
            options={
                'ordering': ('game_id', 'source', 'type', 'id'),
                'unique_together': {('game', 'type', 'source')},
            },
        ),
    ]
