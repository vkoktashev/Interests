from django.conf import settings
from django.core.mail import EmailMessage

from config.celery import app
from utils.celery import execute_locked_task
from utils.error_digest import (
    acknowledge_error_digest,
    format_error_digest,
    get_redis_client,
    take_error_digest,
)


@app.task
def send_error_digest():
    return execute_locked_task('send_error_digest', 'daily', _send_error_digest, timeout=60 * 10)


def _send_error_digest():
    client = get_redis_client()
    recipients = [email for _, email in settings.ADMINS]
    if client is None or not recipients:
        return 0

    groups = take_error_digest(client)
    if not groups:
        return 0

    subject, body = format_error_digest(groups)
    EmailMessage(subject, body, from_email=settings.EMAIL_HOST_USER, to=recipients).send()
    acknowledge_error_digest(client)
    return len(groups)
