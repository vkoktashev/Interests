from drf_yasg import openapi

DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_SIZE = 5

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER)
page_size_param = openapi.Parameter('page_size', openapi.IN_QUERY, description="Размер страницы",
                                    type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE)
