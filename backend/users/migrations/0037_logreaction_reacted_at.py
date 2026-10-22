import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0036_logreaction_more_emojis'),
    ]

    operations = [
        # Existing reactions have no recorded time; leave it unknown.
        migrations.AddField(
            model_name='logreaction',
            name='reacted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='logreaction',
            name='reacted_at',
            field=models.DateTimeField(blank=True, default=django.utils.timezone.now, null=True),
        ),
    ]
