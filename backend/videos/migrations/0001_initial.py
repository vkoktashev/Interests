from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Video',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(blank=True, max_length=100)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('url', models.URLField(max_length=500)),
                ('source', models.CharField(max_length=50)),
                ('platform', models.CharField(blank=True, max_length=50)),
                ('type', models.CharField(blank=True, max_length=50)),
            ],
            options={
                'ordering': ('id',),
                'constraints': (
                    models.UniqueConstraint(
                        fields=('source', 'url'), name='unique_source_video_url',
                    ),
                ),
            },
        ),
    ]
