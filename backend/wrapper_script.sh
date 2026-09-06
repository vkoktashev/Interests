celery -A config worker -l info &
celery -A config beat -l debug &
python manage.py collectstatic --noinput
exec uvicorn config.asgi:application --host 0.0.0.0 --port 8001 --workers 4
