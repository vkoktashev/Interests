from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0011_query_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='tmdb_credits_last_update',
            field=models.DateTimeField(null=True),
        ),
        migrations.CreateModel(
            name='PersonCredit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('media_type', models.CharField(
                    choices=[('movie', 'Movie'), ('show', 'Show')],
                    max_length=10,
                )),
                ('tmdb_id', models.PositiveIntegerField()),
                ('name', models.CharField(max_length=300)),
                ('release_date', models.DateField(null=True)),
                ('roles', models.JSONField(default=list)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('person', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='credits',
                    to='people.person',
                )),
            ],
            options={
                'verbose_name': 'работа человека',
                'verbose_name_plural': 'работы людей',
                'db_table': 'people_person_credit',
                'indexes': [
                    models.Index(
                        fields=['release_date', 'media_type'],
                        name='pcredit_release_type_idx',
                    ),
                ],
                'constraints': [
                    models.UniqueConstraint(
                        fields=('person', 'media_type', 'tmdb_id'),
                        name='unique_person_media_credit',
                    ),
                ],
            },
        ),
    ]
