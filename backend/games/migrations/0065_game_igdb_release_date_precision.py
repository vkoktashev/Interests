from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0064_localize_admin_model_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='igdb_release_date_format',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_release_date_display',
            field=models.CharField(blank=True, default='', max_length=50),
            preserve_default=False,
        ),
    ]
