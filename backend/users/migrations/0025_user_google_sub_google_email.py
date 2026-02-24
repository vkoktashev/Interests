from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0024_alter_user_privacy'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='google_email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='google_sub',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
    ]
