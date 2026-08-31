from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('movies', '0032_movieperson_character'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='usermovie',
            constraint=models.CheckConstraint(
                condition=models.Q(score__gte=0, score__lte=10),
                name='user_movie_score_between_0_and_10',
            ),
        ),
    ]
