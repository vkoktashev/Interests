import json
import re
from difflib import SequenceMatcher
from html import unescape
from typing import Any, Optional
from urllib.parse import quote

import requests
from django.core.cache import cache
from django.utils.text import slugify


PLATI_SEARCH_URL_TEMPLATE = 'https://plati.market/search/{query}'
PLATI_GAME_URL_TEMPLATE = 'https://plati.market/games/{slug}/{category_id}/'
PLATI_REQUEST_TIMEOUT_SECS = 8
PLATI_CACHE_TTL_SECS = 60 * 60
PLATI_CACHE_MISS = object()
PLATI_CACHE_VERSION = 'v4'
PLATI_STORE_INFO = {
    'id': 1002,
    'name': 'Plati',
    'slug': 'plati',
}
PLATI_CURRENCY_CODE = 'RUB'
PLATI_CATEGORY_PATTERN = re.compile(r"findedCategories:\s*'([^']*)'", re.IGNORECASE)
PLATI_ITEM_PATTERN = re.compile(
    r'<a class="card[^"]*" href="(?P<href>/itm/[^"]+)" title="(?P<title>[^"]+)"[^>]*>.*?'
    r'<span class="title-bold color-text-title">(?P<price>.*?)</span>',
    re.IGNORECASE | re.DOTALL,
)
PLATI_BAD_TITLE_TOKENS = (
    'аккаунт',
    'account',
    'на ваш аккаунт',
    'ваш аккаунт',
    'услуг',
    'service',
    'бустинг',
    'boost',
    'онлайн',
    'прогресс',
    'патч',
    'чертеж',
    'чертежи',
    'предмет',
    'валют',
    'жетон',
    'microsoft store',
    'windows store',
    'xbox',
    'ps4',
    'ps5',
    'psn',
    'playstation',
    'nintendo',
    'switch',
    'deluxe',
    'dlc',
    'ultimate',
    'season pass',
    'bundle',
    'expansion',
    'upgrade',
    'region change',
    'изменени',
    'add-on',
    'дополн',
    'микрософт',
)
PLATI_REQUIRED_TITLE_TOKENS = (
    'steam',
    'стим',
    'gift',
    'гифт',
    'ключ',
    'key',
)
PLATI_HEADERS = {
    'Accept-Language': 'ru-RU,ru;q=0.9',
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/131.0.0.0 Safari/537.36'
    ),
}
PLATI_ALLOWED_REGION_TOKENS = (
    'россия',
    'рф',
    'ru',
    'russia',
    'казахстан',
    'kz',
    'kazakhstan',
    'снг',
    'cis',
)


def get_plati_store_info() -> dict[str, Any]:
    return dict(PLATI_STORE_INFO)


def _normalize_name(value: str | None) -> str:
    return ''.join(ch.lower() for ch in (value or '') if ch.isalnum())


def _normalize_text(value: str | None) -> str:
    plain_text = re.sub(r'<[^>]+>', ' ', value or '')
    plain_text = unescape(plain_text)
    return re.sub(r'\s+', ' ', plain_text).strip()


def _format_rub_amount(value: int | None) -> str:
    if value is None:
        return ''
    return f'{value:,}'.replace(',', ' ') + ' ₽'


def _parse_amount(value: str | None) -> Optional[int]:
    digits = ''.join(ch for ch in (value or '') if ch.isdigit())
    if not digits:
        return None

    try:
        return int(digits)
    except (TypeError, ValueError):
        return None


def _score_category_match(expected_name: str | None, category_name: str | None) -> float:
    normalized_expected = _normalize_name(expected_name)
    normalized_category = _normalize_name(category_name)
    if not normalized_expected or not normalized_category:
        return 0.0

    if normalized_expected == normalized_category:
        return 1.0

    if normalized_expected in normalized_category or normalized_category in normalized_expected:
        length_ratio = min(len(normalized_expected), len(normalized_category)) / max(len(normalized_expected), len(normalized_category))
        return 0.75 + (0.2 * length_ratio)

    return SequenceMatcher(None, normalized_expected, normalized_category).ratio()


def _parse_search_categories(html: str) -> list[dict[str, str]]:
    match = PLATI_CATEGORY_PATTERN.search(html or '')
    if not match:
        return []

    raw_value = match.group(1).strip()
    if not raw_value:
        return []

    normalized_value = raw_value.replace(',]', ']')

    try:
        payload = json.loads(normalized_value)
    except json.JSONDecodeError:
        return []

    result = []
    for item in payload or []:
        category_id = str(item.get('ID_CB') or '').strip()
        category_name = str(item.get('CategoryName') or '').strip()
        if not category_id or not category_name:
            continue
        result.append({
            'id': category_id,
            'name': category_name,
        })
    return result


def _search_plati_category(game_name: str | None) -> Optional[dict[str, str]]:
    normalized_query = (game_name or '').strip()
    if not normalized_query:
        return None

    cache_key = f'plati_category_search:{PLATI_CACHE_VERSION}:{normalized_query.lower()}'
    cached_value = cache.get(cache_key, PLATI_CACHE_MISS)
    if cached_value is not PLATI_CACHE_MISS:
        return cached_value

    search_url = PLATI_SEARCH_URL_TEMPLATE.format(query=quote(normalized_query))
    response = requests.get(search_url, headers=PLATI_HEADERS, timeout=PLATI_REQUEST_TIMEOUT_SECS)
    response.raise_for_status()

    categories = _parse_search_categories(response.text or '')
    best_category = None
    best_score = 0.0
    for category in categories:
        score = _score_category_match(game_name, category.get('name'))
        if score > best_score:
            best_score = score
            best_category = category

    if best_score < 0.88:
        best_category = None

    cache.set(cache_key, best_category, PLATI_CACHE_TTL_SECS)
    return best_category


def _is_relevant_offer_title(title: str | None, game_name: str | None) -> bool:
    normalized_title = _normalize_text(title).lower()
    normalized_game_name = _normalize_text(game_name).lower()
    normalized_compact_title = _normalize_name(normalized_title)
    normalized_compact_game_name = _normalize_name(normalized_game_name)

    if not normalized_title or not normalized_compact_game_name:
        return False

    if normalized_compact_game_name not in normalized_compact_title:
        similarity = SequenceMatcher(None, normalized_compact_game_name, normalized_compact_title).ratio()
        if similarity < 0.55:
            return False

    if not any(token in normalized_title for token in PLATI_REQUIRED_TITLE_TOKENS):
        return False

    if any(token in normalized_title for token in PLATI_BAD_TITLE_TOKENS):
        return False

    if not any(token in normalized_title for token in PLATI_ALLOWED_REGION_TOKENS):
        return False

    return True


def _extract_plati_items(html: str, game_name: str | None) -> list[dict[str, Any]]:
    items = []
    for match in PLATI_ITEM_PATTERN.finditer(html or ''):
        title = _normalize_text(match.group('title'))
        if not _is_relevant_offer_title(title, game_name):
            continue

        price_value = _parse_amount(_normalize_text(match.group('price')))
        if price_value is None:
            continue

        href = (match.group('href') or '').strip()
        if not href:
            continue

        items.append({
            'title': title,
            'price': price_value,
            'url': f'https://plati.market{href}',
        })
    return items


def get_plati_store_price(game_name: str | None) -> Optional[dict[str, Any]]:
    category = _search_plati_category(game_name)
    if not category:
        return None

    category_id = category['id']
    category_slug = slugify(category['name'])
    if not category_slug:
        return None

    cache_key = f'plati_price:{PLATI_CACHE_VERSION}:{category_id}'
    cached_value = cache.get(cache_key, PLATI_CACHE_MISS)
    if cached_value is not PLATI_CACHE_MISS:
        return cached_value

    category_url = PLATI_GAME_URL_TEMPLATE.format(slug=category_slug, category_id=category_id)
    response = requests.get(category_url, headers=PLATI_HEADERS, timeout=PLATI_REQUEST_TIMEOUT_SECS)
    if response.status_code == 404:
        cache.set(cache_key, None, PLATI_CACHE_TTL_SECS)
        return None

    response.raise_for_status()
    items = _extract_plati_items(response.text or '', game_name)

    if not items:
        cache.set(cache_key, None, PLATI_CACHE_TTL_SECS)
        return None

    best_item = min(items, key=lambda item: item['price'])
    normalized_price = {
        'currency': PLATI_CURRENCY_CODE,
        'discount_percent': 0,
        'final': best_item['price'],
        'formatted_final': _format_rub_amount(best_item['price']),
        'formatted_initial': '',
        'initial': best_item['price'],
        'offer_title': best_item['title'],
        'url': best_item['url'],
    }
    cache.set(cache_key, normalized_price, PLATI_CACHE_TTL_SECS)
    return normalized_price
