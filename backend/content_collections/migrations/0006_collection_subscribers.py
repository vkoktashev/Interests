from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content_collections', '0005_item_order_integrity'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='subscribers',
            field=models.ManyToManyField(
                blank=True,
                related_name='subscribed_collections',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
