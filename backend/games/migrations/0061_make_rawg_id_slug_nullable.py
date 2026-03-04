from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0060_remove_rawg_fields_keep_id_slug'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='rawg_id',
            field=models.IntegerField(blank=True, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='game',
            name='rawg_slug',
            field=models.CharField(blank=True, max_length=200, null=True, unique=True),
        ),
    ]
