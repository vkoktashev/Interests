from django.db import close_old_connections
from django.views.debug import ExceptionReporter


class ConnectionSafeExceptionReporter(ExceptionReporter):
    """
    Under ASGI Django builds error reports in its shared thread pool (thread_sensitive=False),
    where request_finished never closes connections. Rendering frame variables evaluates
    QuerySets, so each pool thread would keep a Postgres connection open until restart.
    """

    def get_traceback_data(self):
        try:
            return super().get_traceback_data()
        finally:
            close_old_connections()
