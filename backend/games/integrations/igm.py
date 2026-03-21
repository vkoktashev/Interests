from html import unescape
import re
from difflib import SequenceMatcher
from typing import Any, Optional

import requests
from django.core.cache import cache
from django.utils.text import slugify


IGM_GAME_URL_TEMPLATE = 'https://igm.gg/game/{slug}'
IGM_PRICE_CACHE_TTL_SECS = 60 * 60
IGM_REQUEST_TIMEOUT_SECS = 8
IGM_CACHE_MISS = object()
IGM_CURRENCY_CODE = 'RUB'
IGM_STORE_INFO = {
    'id': 1001,
    'name': 'IGM',
    'slug': 'igm',
}
IGM_PRICE_PATTERN = re.compile(r'(\d[\d\s\xa0]*)\s*₽')
IGM_DISCOUNT_PATTERN = re.compile(r'-\s*(\d+)\s*%')
IGM_NAME_PATTERN = re.compile(r'<h1[^>]*>(.*?)</h1>', re.IGNORECASE | re.DOTALL)


def build_igm_game_url(slug: str | None) -> str:
    normalized_slug = (slug or '').strip().strip('/')
    if not normalized_slug:
        return ''
    return IGM_GAME_URL_TEMPLATE.format(slug=normalized_slug)


def get_igm_store_info() -> dict[str, Any]:
    return dict(IGM_STORE_INFO)


def _format_rub_amount(value: int | None) -> str:
    if value is None:
        return ''
    return f'{value:,}'.replace(',', ' ') + ' ₽'


def _parse_amount(value: str | None) -> Optional[int]:
    if not value:
        return None

    digits = ''.join(ch for ch in value if ch.isdigit())
    if not digits:
        return None

    try:
        return int(digits)
    except (TypeError, ValueError):
        return None


def _extract_price_window(html: str) -> str:
    marker = 'Без подписки IGM'
    marker_index = html.find(marker)
    if marker_index < 0:
        return ''

    start_index = max(0, marker_index - 1600)
    end_index = min(len(html), marker_index + 200)
    return html[start_index:end_index]


def _html_to_text(value: str) -> str:
    plain_text = re.sub(r'<[^>]+>', ' ', value or '')
    plain_text = unescape(plain_text)
    return re.sub(r'\s+', ' ', plain_text).strip()


def _normalize_name(value: str | None) -> str:
    return ''.join(ch.lower() for ch in (value or '') if ch.isalnum())


def _extract_page_game_name(html: str) -> str:
    match = IGM_NAME_PATTERN.search(html or '')
    if not match:
        return ''
    return _html_to_text(match.group(1))


def _matches_expected_game_name(expected_name: str | None, page_name: str | None) -> bool:
    normalized_expected = _normalize_name(expected_name)
    normalized_page = _normalize_name(page_name)

    if not normalized_expected or not normalized_page:
        return True

    if normalized_expected == normalized_page:
        return True

    if normalized_expected in normalized_page or normalized_page in normalized_expected:
        return True

    similarity = SequenceMatcher(None, normalized_expected, normalized_page).ratio()
    return similarity >= 0.9


def _build_slug_candidates(game_slug: str | None, game_name: str | None) -> list[str]:
    candidates: list[str] = []

    def append_candidate(value: str | None):
        normalized_value = (value or '').strip().strip('/')
        if normalized_value and normalized_value not in candidates:
            candidates.append(normalized_value)

    normalized_slug = (game_slug or '').strip().strip('/')
    append_candidate(normalized_slug)
    append_candidate(re.sub(r'--\d+$', '', normalized_slug))
    append_candidate(slugify(game_name or ''))
    return candidates


def _normalize_igm_price(html: str, store_url: str) -> Optional[dict[str, Any]]:
    if not isinstance(html, str) or not html:
        return None

    price_window = _extract_price_window(_html_to_text(html))
    if not price_window:
        return None

    price_matches = IGM_PRICE_PATTERN.findall(price_window)
    if not price_matches:
        return None

    parsed_prices = [_parse_amount(item) for item in price_matches]
    normalized_prices = [item for item in parsed_prices if item is not None]
    if not normalized_prices:
        return None

    final_value = normalized_prices[-2] if len(normalized_prices) >= 2 else normalized_prices[-1]
    initial_value = normalized_prices[-1] if len(normalized_prices) >= 2 else normalized_prices[-1]
    if initial_value < final_value:
        initial_value = final_value

    discount_match = IGM_DISCOUNT_PATTERN.findall(price_window)
    discount_percent = int(discount_match[-1]) if discount_match else 0
    if discount_percent <= 0 and initial_value > final_value:
        discount_percent = round((initial_value - final_value) / initial_value * 100)

    formatted_initial = _format_rub_amount(initial_value) if initial_value > final_value else ''

    return {
        'currency': IGM_CURRENCY_CODE,
        'discount_percent': discount_percent,
        'final': final_value,
        'formatted_final': _format_rub_amount(final_value),
        'formatted_initial': formatted_initial,
        'initial': initial_value,
        'url': store_url,
    }


def _get_igm_store_price_by_slug(game_slug: str, game_name: str | None = None) -> Optional[dict[str, Any]]:
    store_url = build_igm_game_url(game_slug)
    if not store_url:
        return None

    cache_key = f'igm_price:{game_slug.strip().lower()}'
    cached_value = cache.get(cache_key, IGM_CACHE_MISS)
    if cached_value is not IGM_CACHE_MISS:
        return cached_value

    response = requests.get(
        store_url,
        headers={
            'Accept-Language': 'ru-RU,ru;q=0.9',
            'User-Agent': (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/131.0.0.0 Safari/537.36'
            ),
        },
        timeout=IGM_REQUEST_TIMEOUT_SECS,
    )

    if response.status_code == 404:
        cache.set(cache_key, None, IGM_PRICE_CACHE_TTL_SECS)
        return None

    response.raise_for_status()

    page_name = _extract_page_game_name(response.text or '')
    if not _matches_expected_game_name(game_name, page_name):
        cache.set(cache_key, None, IGM_PRICE_CACHE_TTL_SECS)
        return None

    normalized_price = _normalize_igm_price(response.text or '', store_url)
    cache.set(cache_key, normalized_price, IGM_PRICE_CACHE_TTL_SECS)
    return normalized_price


def get_igm_store_price(game_slug: str | None, game_name: str | None = None) -> Optional[dict[str, Any]]:
    for candidate_slug in _build_slug_candidates(game_slug, game_name):
        try:
            price = _get_igm_store_price_by_slug(candidate_slug, game_name)
        except Exception:
            continue

        if price:
            return price

    return None
