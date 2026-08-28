from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content_collections', '0002_collection_display_mode'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='privacy',
            field=models.CharField(
                choices=[('public', 'Публичная'), ('private', 'Приватная')],
                default='public',
                max_length=16,
            ),
        ),
    ]
