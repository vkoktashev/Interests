class ExternalIntegrationError(Exception):
    def __init__(self, provider, message=None, status_code=None):
        self.provider = provider
        self.status_code = status_code
        super().__init__(message or f'{provider} integration failed')


class ExternalNotFoundError(ExternalIntegrationError):
    pass


class ExternalUnavailableError(ExternalIntegrationError):
    pass


def get_error_status_code(error):
    response = getattr(error, 'response', None)
    if response is not None:
        return response.status_code

    try:
        return int(str(error.args[0]).split(' ', 1)[0])
    except (AttributeError, IndexError, TypeError, ValueError):
        return None
