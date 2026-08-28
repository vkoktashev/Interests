from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content_collections', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='display_mode',
            field=models.CharField(
                choices=[('mixed', 'Смешанная'), ('grouped', 'Раздельная')],
                default='mixed',
                max_length=16,
            ),
        ),
    ]
