from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0062_gamebeattime'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamebeattime',
            name='last_update',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
