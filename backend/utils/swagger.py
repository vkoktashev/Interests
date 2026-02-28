try:
    from drf_yasg import openapi as _openapi
    from drf_yasg.utils import swagger_auto_schema as _swagger_auto_schema
    from drf_yasg.views import get_schema_view as _get_schema_view

    openapi = _openapi
    swagger_auto_schema = _swagger_auto_schema
    get_schema_view = _get_schema_view
    swagger_available = True
except Exception:  # pragma: no cover - fallback for incompatible drf_yasg
    swagger_available = False

    class _OpenApiObject:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

    class _OpenApiFallback:
        IN_QUERY = 'query'
        IN_PATH = 'path'
        TYPE_STRING = 'string'
        TYPE_INTEGER = 'integer'
        TYPE_NUMBER = 'number'
        TYPE_OBJECT = 'object'
        TYPE_ARRAY = 'array'

        Parameter = _OpenApiObject
        Response = _OpenApiObject
        Schema = _OpenApiObject
        Info = _OpenApiObject

    def swagger_auto_schema(*args, **kwargs):
        def decorator(func):
            return func

        return decorator

    def get_schema_view(*args, **kwargs):
        return None

    openapi = _OpenApiFallback()
