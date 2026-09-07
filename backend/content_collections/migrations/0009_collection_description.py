from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('content_collections', '0008_item_caption')]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='description',
            field=models.TextField('Описание', blank=True, default='', max_length=2000),
        ),
    ]
