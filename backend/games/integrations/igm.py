from html import unescape
import json
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
IGM_CACHE_VERSION = 'v6'
IGM_CURRENCY_CODE = 'RUB'
IGM_STORE_INFO = {
    'id': 1001,
    'name': 'IGM',
    'slug': 'igm',
}
IGM_PRICE_PATTERN = re.compile(r'(\d[\d\s\xa0]*)\s*₽')
IGM_DISCOUNT_PATTERN = re.compile(r'-\s*(\d+)\s*%')
IGM_NAME_PATTERN = re.compile(r'<h1[^>]*>(.*?)</h1>', re.IGNORECASE | re.DOTALL)
IGM_NEXT_DATA_PATTERN = re.compile(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', re.DOTALL)


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


def _normalize_igm_region(region: str | None) -> str:
    normalized_region = (region or '').strip().lower()
    if normalized_region == 'kz':
        return 'kz'
    return 'ru'


def _matches_igm_modification_region(region_data: Any, account_region: str) -> bool:
    if not isinstance(region_data, dict):
        return False

    target_region = _normalize_igm_region(account_region)
    region_name = (region_data.get('name') or '').lower()
    region_slug = (region_data.get('slug') or '').lower()
    has_kz = 'казахстан' in region_name or 'kaz' in region_slug or 'kz' in region_slug
    has_cis = 'снг' in region_name or 'sng' in region_slug or 'cis' in region_slug
    has_ru = 'россия' in region_name or 'рф' in region_name or 'ross' in region_slug or 'rf' in region_slug
    excludes_ru = (
        'кроме рф' in region_name
        or 'без рф' in region_name
        or 'krome-rf' in region_slug
        or 'bez-rf' in region_slug
    )

    if target_region == 'kz':
        return has_kz or has_cis

    if excludes_ru:
        return False

    return has_ru or has_cis


def _normalize_igm_price(html: str, store_url: str, account_region: str = 'ru') -> Optional[dict[str, Any]]:
    if not isinstance(html, str) or not html:
        return None

    payload_price = _extract_igm_price_from_payload(html, store_url, account_region)
    if payload_price:
        return payload_price

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

    discount_match = IGM_DISCOUNT_PATTERN.findall(price_window)
    discount_percent = int(discount_match[-1]) if discount_match else 0
    if discount_percent > 0 and len(normalized_prices) >= 2:
        final_value = normalized_prices[-2]
        initial_value = normalized_prices[-1]
        if initial_value < final_value:
            initial_value = final_value
    else:
        final_value = normalized_prices[-1]
        initial_value = final_value

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


def _decode_next_payloads(html: str) -> list[str]:
    decoded_payloads = []
    for match in IGM_NEXT_DATA_PATTERN.finditer(html or ''):
        raw_payload = match.group(1)
        if not raw_payload:
            continue

        try:
            decoded_payload = json.loads(f'"{raw_payload}"')
        except json.JSONDecodeError:
            continue

        decoded_payloads.append(decoded_payload)
    return decoded_payloads


def _extract_balanced_json_fragment(value: str, start_index: int) -> tuple[str, int] | tuple[None, None]:
    if start_index < 0 or start_index >= len(value):
        return None, None

    opening_char = value[start_index]
    closing_char = '}' if opening_char == '{' else ']'
    if opening_char not in '{[':
        return None, None

    depth = 0
    in_string = False
    is_escaped = False

    for index in range(start_index, len(value)):
        char = value[index]

        if in_string:
            if is_escaped:
                is_escaped = False
            elif char == '\\':
                is_escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char == opening_char:
            depth += 1
            continue

        if char == closing_char:
            depth -= 1
            if depth == 0:
                return value[start_index:index + 1], index + 1

    return None, None


def _extract_json_value(payload: str, marker: str, start_index: int = 0) -> tuple[Any, int] | tuple[None, None]:
    marker_index = payload.find(marker, start_index)
    if marker_index < 0:
        return None, None

    value_index = marker_index + len(marker)
    if value_index >= len(payload):
        return None, None

    if payload.startswith('null', value_index):
        return None, value_index + 4

    fragment, end_index = _extract_balanced_json_fragment(payload, value_index)
    if not fragment:
        return None, None

    try:
        return json.loads(fragment), end_index
    except json.JSONDecodeError:
        return None, None


def _build_igm_price_payload(
    final_value: int | None,
    price_value: int | None,
    discount_percent: int | None,
    store_url: str,
) -> Optional[dict[str, Any]]:
    if final_value is None and price_value is None:
        return None

    normalized_discount = int(discount_percent or 0)
    if normalized_discount <= 0 and price_value is not None:
        final_value = int(price_value)
    elif final_value is not None:
        final_value = int(final_value)
    else:
        final_value = int(price_value)

    price_value = int(price_value if price_value is not None else final_value)
    if price_value < final_value:
        price_value = final_value

    formatted_initial = _format_rub_amount(price_value) if price_value > final_value else ''

    return {
        'currency': IGM_CURRENCY_CODE,
        'discount_percent': normalized_discount,
        'final': final_value,
        'formatted_final': _format_rub_amount(final_value),
        'formatted_initial': formatted_initial,
        'initial': price_value,
        'url': store_url,
    }


def _extract_price_from_modifications(payload: str, store_url: str, account_region: str) -> Optional[dict[str, Any]]:
    modifications, _ = _extract_json_value(payload, '"modifications":')
    if not isinstance(modifications, list) or not modifications:
        return None

    region_specific_modification = next(
        (
            item for item in modifications
            if isinstance(item, dict) and _matches_igm_modification_region(item.get('region'), account_region)
        ),
        None,
    )
    default_modification = next(
        (item for item in modifications if isinstance(item, dict) and item.get('is_default')),
        modifications[0] if isinstance(modifications[0], dict) else None,
    )
    selected_modification = region_specific_modification or default_modification
    if not isinstance(selected_modification, dict):
        return None

    return _build_igm_price_payload(
        final_value=selected_modification.get('final_price'),
        price_value=selected_modification.get('price'),
        discount_percent=selected_modification.get('discount'),
        store_url=store_url,
    )


def _extract_price_from_gift_regions(payload: str, store_url: str, account_region: str) -> Optional[dict[str, Any]]:
    dlcs_index = payload.find('"dlcs":')
    search_start = dlcs_index if dlcs_index >= 0 else 0

    gift, _ = _extract_json_value(payload, '"gift":', search_start)
    if not isinstance(gift, dict):
        return None

    regions_price_list = gift.get('regions_price_list')
    if not isinstance(regions_price_list, list) or not regions_price_list:
        return None

    target_region_code = 'KZ' if _normalize_igm_region(account_region) == 'kz' else 'RU'
    preferred_region = next(
        (
            item for item in regions_price_list
            if isinstance(item, dict) and (item.get('region') or '').upper() == target_region_code
        ),
        None,
    )
    ru_region = next(
        (
            item for item in regions_price_list
            if isinstance(item, dict) and (item.get('region') or '').upper() == 'RU'
        ),
        None,
    )
    fallback_region = next((item for item in regions_price_list if isinstance(item, dict)), None)
    selected_region = preferred_region or ru_region or fallback_region
    if not isinstance(selected_region, dict):
        return None

    return _build_igm_price_payload(
        final_value=selected_region.get('final_price'),
        price_value=selected_region.get('price'),
        discount_percent=selected_region.get('discount'),
        store_url=store_url,
    )


def _extract_igm_price_from_payload(html: str, store_url: str, account_region: str = 'ru') -> Optional[dict[str, Any]]:
    for payload in _decode_next_payloads(html):
        modifications_price = _extract_price_from_modifications(payload, store_url, account_region)
        if modifications_price:
            return modifications_price

        gift_price = _extract_price_from_gift_regions(payload, store_url, account_region)
        if gift_price:
            return gift_price

    return None


def _get_igm_store_price_by_slug(
    game_slug: str,
    game_name: str | None = None,
    account_region: str = 'ru',
) -> Optional[dict[str, Any]]:
    store_url = build_igm_game_url(game_slug)
    if not store_url:
        return None

    normalized_region = _normalize_igm_region(account_region)
    cache_key = f'igm_price:{IGM_CACHE_VERSION}:{game_slug.strip().lower()}:{normalized_region}'
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

    normalized_price = _normalize_igm_price(response.text or '', store_url, normalized_region)
    cache.set(cache_key, normalized_price, IGM_PRICE_CACHE_TTL_SECS)
    return normalized_price


def get_igm_store_price(
    game_slug: str | None,
    game_name: str | None = None,
    account_region: str = 'ru',
) -> Optional[dict[str, Any]]:
    for candidate_slug in _build_slug_candidates(game_slug, game_name):
        try:
            price = _get_igm_store_price_by_slug(candidate_slug, game_name, account_region)
        except Exception:
            continue

        if price:
            return price

    return None
