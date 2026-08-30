from time import time

from django.http import HttpResponse
from django.utils.http import http_date, parse_http_date_safe
from rest_framework import status


IMAGE_CLIENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365


def get_image_http_response(image_data, request, cache_status=''):
    if_none_match = request.headers.get('If-None-Match')
    if_modified_since = request.headers.get('If-Modified-Since')
    etag = image_data.get('etag')
    last_modified_ts = image_data.get('last_modified_ts') or int(time())
    last_modified = http_date(last_modified_ts)

    if if_none_match and if_none_match == etag:
        response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
    elif if_modified_since:
        since_ts = parse_http_date_safe(if_modified_since)
        if since_ts is not None and since_ts >= last_modified_ts:
            response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
        else:
            response = _get_content_response(image_data)
    else:
        response = _get_content_response(image_data)

    response['Cache-Control'] = f'public, max-age={IMAGE_CLIENT_MAX_AGE_SECONDS}, immutable'
    response['ETag'] = etag
    response['Last-Modified'] = last_modified
    if cache_status:
        response['X-Proxy-Cache'] = cache_status
    return response


def _get_content_response(image_data):
    return HttpResponse(
        image_data.get('content', b''),
        content_type=image_data.get('content_type', 'image/jpeg'),
    )
