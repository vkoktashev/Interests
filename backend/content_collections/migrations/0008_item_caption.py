from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('content_collections', '0007_system_collection')]

    operations = [
        migrations.AddField(
            model_name='collectionitemorder',
            name='caption',
            field=models.TextField('Подпись', blank=True, default='', max_length=2000),
        ),
    ]
