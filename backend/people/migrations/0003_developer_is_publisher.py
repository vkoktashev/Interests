from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0002_developer'),
    ]

    operations = [
        migrations.AddField(
            model_name='developer',
            name='is_publisher',
            field=models.BooleanField(default=False),
        ),
    ]
