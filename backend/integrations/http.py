import requests
from requests import RequestException

from integrations.exceptions import ExternalNotFoundError, ExternalUnavailableError


DEFAULT_EXTERNAL_TIMEOUT_SECS = 8


def external_request(
        provider,
        method,
        url,
        *,
        timeout=DEFAULT_EXTERNAL_TIMEOUT_SECS,
        allowed_statuses=(),
        **kwargs
):
    try:
        response = requests.request(method, url, timeout=timeout, **kwargs)
        if response.status_code in allowed_statuses:
            return response
        response.raise_for_status()
        return response
    except RequestException as error:
        status_code = getattr(getattr(error, 'response', None), 'status_code', None)
        error_class = ExternalNotFoundError if status_code == 404 else ExternalUnavailableError
        raise error_class(provider, status_code=status_code) from error
