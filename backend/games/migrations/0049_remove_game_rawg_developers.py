from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0048_gamedeveloper'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='rawg_developers',
        ),
    ]
