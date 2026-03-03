from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0003_developer_is_publisher'),
    ]

    operations = [
        migrations.RenameField(
            model_name='developer',
            old_name='rawg_id',
            new_name='igdb_id',
        ),
    ]
