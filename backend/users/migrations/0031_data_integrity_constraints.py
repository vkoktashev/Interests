import django.db.models.functions.text
from django.db import migrations, models


def remove_self_follows(apps, schema_editor):
    UserFollow = apps.get_model('users', 'UserFollow')
    UserFollow.objects.filter(user_id=models.F('followed_user_id')).delete()


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('users', '0030_localize_admin_model_names'),
    ]

    operations = [
        migrations.RunPython(
            remove_self_follows,
            migrations.RunPython.noop,
            atomic=True,
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                django.db.models.functions.text.Lower('username'),
                name='unique_user_username_case_insensitive',
            ),
        ),
        migrations.AddConstraint(
            model_name='user',
            constraint=models.UniqueConstraint(
                django.db.models.functions.text.Lower('email'),
                name='unique_user_email_case_insensitive',
            ),
        ),
        migrations.AddConstraint(
            model_name='userfollow',
            constraint=models.CheckConstraint(
                condition=~models.Q(user=models.F('followed_user')),
                name='prevent_user_self_follow',
            ),
        ),
    ]
