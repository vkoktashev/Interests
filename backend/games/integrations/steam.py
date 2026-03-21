import re
from decimal import Decimal, InvalidOperation
from typing import Any, Optional
from urllib.parse import urlparse

import requests
from django.core.cache import cache


STEAM_APPDETAILS_URL = 'https://store.steampowered.com/api/appdetails'
STEAM_PRICE_CACHE_TTL_SECS = 60 * 60
STEAM_LANGUAGE = 'russian'
STEAM_CACHE_MISS = object()
STEAM_DEFAULT_COUNTRY_CODE = 'ru'
STEAM_CURRENCY_SUFFIXES = {
    'KZT': 'тг',
    'RUB': 'руб.',
}
STEAM_REGION_LABELS = {
    'kz': 'Казахстан',
    'ru': 'Россия',
}


def extract_steam_app_id(url: str | None) -> Optional[int]:
    if not url:
        return None

    parsed_url = urlparse(url)
    if 'steampowered.com' not in parsed_url.netloc:
        return None

    match = re.search(r'/app/(\d+)', parsed_url.path or '')
    if not match:
        return None

    try:
        return int(match.group(1))
    except (TypeError, ValueError):
        return None


def get_steam_region_label(country_code: str | None) -> str:
    normalized_country_code = (country_code or STEAM_DEFAULT_COUNTRY_CODE).strip().lower() or STEAM_DEFAULT_COUNTRY_CODE
    return STEAM_REGION_LABELS.get(normalized_country_code, normalized_country_code.upper())


def _format_amount_from_minor_units(value: Any, currency: str | None = None) -> str:
    try:
        amount = (Decimal(str(value)) / Decimal('100')).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        return ''

    if amount == amount.to_integral():
        normalized_amount = f'{int(amount)}'
    else:
        normalized_amount = f'{amount.normalize()}'

    currency_code = (currency or 'RUB').strip().upper() or 'RUB'
    suffix = STEAM_CURRENCY_SUFFIXES.get(currency_code, currency_code)
    return f'{normalized_amount} {suffix}'


def _normalize_steam_price(data: dict[str, Any], store_url: str) -> Optional[dict[str, Any]]:
    if not isinstance(data, dict):
        return None

    if data.get('is_free'):
        return {
            'currency': 'RUB',
            'final': 0,
            'initial': 0,
            'discount_percent': 0,
            'formatted_final': 'Бесплатно',
            'formatted_initial': '',
            'url': store_url,
        }

    price_overview = data.get('price_overview')
    if not isinstance(price_overview, dict):
        return None

    final_value = price_overview.get('final')
    initial_value = price_overview.get('initial')
    discount_percent = price_overview.get('discount_percent') or 0
    currency_code = price_overview.get('currency') or 'RUB'

    formatted_final = (price_overview.get('final_formatted') or '').strip()
    formatted_initial = (price_overview.get('initial_formatted') or '').strip()

    if not formatted_final:
        formatted_final = _format_amount_from_minor_units(final_value, currency_code)
    if not formatted_initial and initial_value and initial_value != final_value:
        formatted_initial = _format_amount_from_minor_units(initial_value, currency_code)

    return {
        'currency': currency_code,
        'final': final_value,
        'initial': initial_value,
        'discount_percent': discount_percent,
        'formatted_final': formatted_final,
        'formatted_initial': formatted_initial,
        'url': store_url,
    }


def get_steam_store_price(store_url: str | None, country_code: str | None = None) -> Optional[dict[str, Any]]:
    app_id = extract_steam_app_id(store_url)
    if app_id is None:
        return None

    normalized_country_code = (country_code or STEAM_DEFAULT_COUNTRY_CODE).strip().lower() or STEAM_DEFAULT_COUNTRY_CODE
    cache_key = f'steam_price:{normalized_country_code}:{STEAM_LANGUAGE}:{app_id}'
    cached_value = cache.get(cache_key, STEAM_CACHE_MISS)
    if cached_value is not STEAM_CACHE_MISS:
        return cached_value

    response = requests.get(
        STEAM_APPDETAILS_URL,
        params={
            'appids': app_id,
            'cc': normalized_country_code,
            'l': STEAM_LANGUAGE,
        },
        timeout=8,
    )
    response.raise_for_status()
    payload = response.json() or {}

    app_payload = payload.get(str(app_id)) or {}
    if not app_payload.get('success'):
        cache.set(cache_key, None, STEAM_PRICE_CACHE_TTL_SECS)
        return None

    normalized_price = _normalize_steam_price(app_payload.get('data') or {}, store_url or '')
    cache.set(cache_key, normalized_price, STEAM_PRICE_CACHE_TTL_SECS)
    return normalized_price
