from rest_framework import serializers

from proxy.functions import get_proxy_url
from .models import Collection


def get_ordered_content(collection):
    media_groups = (
        [('game', game.pk, game) for game in collection.games.all()],
        [('movie', movie.pk, movie) for movie in collection.movies.all()],
        [('show', show.pk, show) for show in collection.shows.all()],
    )
    content = []
    item_index = 0
    while any(item_index < len(group) for group in media_groups):
        for group in media_groups:
            if item_index < len(group):
                content.append(group[item_index])
        item_index += 1

    positions = {
        (item_order.media_type, item_order.object_id): item_order.position
        for item_order in collection.item_orders.all()
    }
    fallback_position = max(positions.values(), default=-1) + 1
    return [
        item
        for _, item in sorted(
            enumerate(content),
            key=lambda indexed_item: (
                positions.get(
                    (indexed_item[1][0], indexed_item[1][1]),
                    fallback_position + indexed_item[0],
                ),
                indexed_item[0],
            ),
        )
    ]


class CollectionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    contains_item = serializers.SerializerMethodField()
    counts = serializers.SerializerMethodField()
    covers = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    @staticmethod
    def get_author(collection):
        return {
            'id': collection.author_id,
            'username': collection.author.username,
        }

    def get_contains_item(self, collection):
        return collection.pk in self.context.get('contained_collection_ids', set())

    @staticmethod
    def get_counts(collection):
        return {
            'games': len(collection.games.all()),
            'movies': len(collection.movies.all()),
            'shows': len(collection.shows.all()),
        }

    def get_covers(self, collection):
        covers = []
        for media_type, _, item in get_ordered_content(collection)[:3]:
            if media_type == 'game':
                name = item.igdb_name
                url = item.igdb_cover_url
            else:
                name = item.tmdb_name or item.tmdb_original_name
                url = item.tmdb_poster_path
            covers.append({
                'type': media_type,
                'name': name,
                'url': get_proxy_url(self.context.get('request'), url),
            })

        return covers

    def get_is_subscribed(self, collection):
        return collection.pk in self.context.get('subscribed_collection_ids', set())

    @staticmethod
    def get_progress(collection):
        if not hasattr(collection, 'completed_games_count'):
            return None

        total = (
            len(collection.games.all())
            + len(collection.movies.all())
            + len(collection.shows.all())
        )
        completed = (
            collection.completed_games_count
            + collection.watched_movies_count
            + collection.watched_shows_count
        )
        return {
            'completed': completed,
            'total': total,
            'percent': round(completed * 100 / total) if total else None,
        }

    class Meta:
        model = Collection
        fields = (
            'id',
            'title',
            'author',
            'display_mode',
            'privacy',
            'created_at',
            'updated_at',
            'contains_item',
            'counts',
            'covers',
            'is_subscribed',
            'progress',
        )
        read_only_fields = (
            'id',
            'author',
            'created_at',
            'updated_at',
            'contains_item',
            'counts',
            'covers',
            'is_subscribed',
            'progress',
        )


class CollectionDetailSerializer(CollectionSerializer):
    items = serializers.SerializerMethodField()
    ordered_items = serializers.SerializerMethodField()

    def get_serialized_items(self, collection):
        if hasattr(self, '_serialized_items'):
            return self._serialized_items

        request = self.context.get('request')
        serialized_items = []
        for media_type, object_id, item in get_ordered_content(collection):
            if media_type == 'game':
                serialized_item = {
                    'type': 'game',
                    'id': item.igdb_slug or item.rawg_slug or item.pk,
                    'order_id': object_id,
                    'name': item.igdb_name or item.hltb_name or item.igdb_slug,
                    'release_year': item.igdb_year or (
                        item.igdb_release_date.year if item.igdb_release_date else None
                    ),
                    'cover_url': get_proxy_url(request, item.igdb_cover_url),
                }
            elif media_type == 'movie':
                serialized_item = {
                    'type': 'movie',
                    'id': item.tmdb_id,
                    'order_id': object_id,
                    'name': item.tmdb_name or item.tmdb_original_name,
                    'release_year': item.tmdb_release_date.year if item.tmdb_release_date else None,
                    'cover_url': get_proxy_url(request, item.tmdb_poster_path),
                }
            else:
                serialized_item = {
                    'type': 'show',
                    'id': item.tmdb_id,
                    'order_id': object_id,
                    'name': item.tmdb_name or item.tmdb_original_name,
                    'release_year': item.tmdb_release_date.year if item.tmdb_release_date else None,
                    'cover_url': get_proxy_url(request, item.tmdb_poster_path),
                }
            serialized_items.append(serialized_item)

        self._serialized_items = serialized_items
        return serialized_items

    def get_items(self, collection):
        items = {'games': [], 'movies': [], 'shows': []}
        group_names = {'game': 'games', 'movie': 'movies', 'show': 'shows'}
        for item in self.get_serialized_items(collection):
            items[group_names[item['type']]].append(item)
        return items

    def get_ordered_items(self, collection):
        return self.get_serialized_items(collection)

    class Meta(CollectionSerializer.Meta):
        fields = CollectionSerializer.Meta.fields + ('items', 'ordered_items')
        read_only_fields = CollectionSerializer.Meta.read_only_fields + (
            'items',
            'ordered_items',
        )
