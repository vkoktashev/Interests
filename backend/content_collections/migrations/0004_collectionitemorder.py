from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('content_collections', '0003_collection_privacy'),
    ]

    operations = [
        migrations.CreateModel(
            name='CollectionItemOrder',
            fields=[
                (
                    'id',
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'media_type',
                    models.CharField(
                        choices=[('game', 'Игра'), ('movie', 'Фильм'), ('show', 'Сериал')],
                        max_length=16,
                    ),
                ),
                ('object_id', models.PositiveIntegerField()),
                ('position', models.PositiveIntegerField(default=0)),
                (
                    'collection',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='item_orders',
                        to='content_collections.collection',
                    ),
                ),
            ],
            options={
                'verbose_name': 'порядок элемента подборки',
                'verbose_name_plural': 'порядок элементов подборки',
                'ordering': ('position', 'id'),
            },
        ),
        migrations.AddConstraint(
            model_name='collectionitemorder',
            constraint=models.UniqueConstraint(
                fields=('collection', 'media_type', 'object_id'),
                name='unique_collection_item_order',
            ),
        ),
    ]
