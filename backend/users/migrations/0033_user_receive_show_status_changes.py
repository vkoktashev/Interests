from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0032_query_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='receive_show_status_changes',
            field=models.BooleanField(default=False),
        ),
    ]
