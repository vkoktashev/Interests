from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

from users.models import User
from utils.constants import LAST_ACTIVITY_INTERVAL_SECS


class LastUserActivityMiddleware(MiddlewareMixin):
    @staticmethod
    def process_response(request, response):
        if request.user.is_authenticated:
            last_activity = request.user.last_activity
            if not last_activity or \
                    timezone.now() - last_activity > timezone.timedelta(seconds=LAST_ACTIVITY_INTERVAL_SECS):
                User.objects.filter(pk=request.user.pk).update(
                    last_activity=timezone.now()
                )
        return response
