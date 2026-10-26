from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0037_logreaction_reacted_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='compact_feed',
            field=models.BooleanField(default=False),
        ),
    ]
