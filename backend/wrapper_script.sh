celery -A config worker -l info --logfile=/logs/celery_worker.log &
celery -A config beat -l debug --logfile=/logs/celery_beat.log &
python manage.py runserver 0.0.0.0:8001