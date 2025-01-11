celery -A config worker -l info --logfile=/logs/celery_worker.log &
celery -A config beat -l debug --logfile=/logs/celery_beat.log &
python manage.py collectstatic --noinput
uvicorn config.asgi:application --host 0.0.0.0 --port 8001 --workers 4