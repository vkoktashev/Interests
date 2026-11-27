from datetime import date
from decimal import Decimal
from hashlib import sha256
from urllib.parse import urlencode

import tmdbsimple as tmdb
from rest_framework import serializers

from integrations.tmdb import cached_tmdb_call
from utils.constants import LANGUAGE


class TmdbSearchParams(serializers.Serializer):
    query = serializers.CharField(required=False, allow_blank=True, default='')
    page = serializers.IntegerField(min_value=1, max_value=500, default=1)
    year = serializers.IntegerField(min_value=1000, max_value=9999, required=False)
    genre = serializers.IntegerField(min_value=1, max_value=2147483647, required=False)
    original_language = serializers.RegexField(r'^[a-z]{2}\Z', required=False)
    min_rating = serializers.DecimalField(
        min_value=Decimal('0'), max_value=Decimal('10'),
        max_digits=3, decimal_places=1, required=False,
    )
    sort = serializers.ChoiceField(choices=('popular', 'rating', 'newest'), required=False)


def search_tmdb_media(media_type, filters):
    is_movie = media_type == 'movie'
    year_param = 'primary_release_year' if is_movie else 'first_air_date_year'
    date_param = 'primary_release_date' if is_movie else 'first_air_date'
    params = {'page': filters['page'], 'language': LANGUAGE}
    if 'year' in filters:
        params[year_param] = filters['year']

    query = filters['query']
    if query:
        mode = 'search'
        provider = tmdb.Search
        params['query'] = query
    else:
        mode = 'discover'
        provider = tmdb.Discover
        if 'genre' in filters:
            params['with_genres'] = filters['genre']
        if 'original_language' in filters:
            params['with_original_language'] = filters['original_language']
        if 'min_rating' in filters:
            params['vote_average.gte'] = str(filters['min_rating'])

        sort = filters.get('sort', 'popular')
        params['sort_by'] = {
            'popular': 'popularity.desc',
            'rating': 'vote_average.desc',
            'newest': f'{date_param}.desc',
        }[sort]
        if sort == 'rating':
            params['vote_count.gte'] = 50
        if sort == 'newest':
            params[f'{date_param}.lte'] = date.today().isoformat()

    cache_key = f'tmdb_{media_type}_{mode}:{sha256(urlencode(params).encode()).hexdigest()}'
    return cached_tmdb_call(cache_key, lambda: getattr(provider(), media_type)(**params))


def get_tmdb_genres(media_type):
    def fetch():
        genres = tmdb.Genres()
        endpoint = genres.movie_list if media_type == 'movie' else genres.tv_list
        return endpoint(language=LANGUAGE).get('genres', [])

    return cached_tmdb_call(f'tmdb_{media_type}_genres_{LANGUAGE}', fetch)
