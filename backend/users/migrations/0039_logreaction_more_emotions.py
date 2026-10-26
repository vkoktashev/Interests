from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0038_user_compact_feed'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='logreaction',
            name='valid_log_reaction_emoji',
        ),
        migrations.AlterField(
            model_name='logreaction',
            name='emoji',
            field=models.CharField(choices=[('👍', 'Нравится'), ('❤️', 'Любовь'), ('🤤', 'Пускаю слюни'), ('🔥', 'Огонь'), ('😂', 'Смешно'), ('😮', 'Удивление'), ('😱', 'Жуть'), ('😢', 'Грусть'), ('🥹', 'Мило'), ('👏', 'Аплодисменты'), ('🤔', 'Задумался'), ('🥱', 'Скучно'), ('💩', 'Какашка'), ('🤮', 'Тошнит')], max_length=8),
        ),
        migrations.AddConstraint(
            model_name='logreaction',
            constraint=models.CheckConstraint(condition=models.Q(('emoji__in', ('👍', '❤️', '🤤', '🔥', '😂', '😮', '😱', '😢', '🥹', '👏', '🤔', '🥱', '💩', '🤮'))), name='valid_log_reaction_emoji'),
        ),
    ]
