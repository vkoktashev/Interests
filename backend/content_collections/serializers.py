from rest_framework import serializers

from games.models import UserGame
from movies.models import UserMovie
from proxy.functions import get_proxy_url
from shows.models import UserShow
from .models import Collection


def serialize_collection_author(collection):
    if collection.author_id is None:
        return {
            'id': None,
            'username': 'Система',
            'gender': None,
            'is_system': True,
        }
    return {
        'id': collection.author_id,
        'username': collection.author.username,
        'gender': collection.author.gender,
        'is_system': False,
    }


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


def get_user_status_labels(content, user):
    if user is None:
        return {}

    status_config = {
        'game': (UserGame, 'game_id', dict(UserGame.STATUS_CHOICES), 'Не играл'),
        'movie': (UserMovie, 'movie_id', dict(UserMovie.STATUS_CHOICES), 'Не смотрел'),
        'show': (UserShow, 'show_id', dict(UserShow.STATUS_CHOICES), 'Не смотрел'),
    }
    object_ids_by_type = {
        media_type: [
            object_id
            for item_media_type, object_id, _ in content
            if item_media_type == media_type
        ]
        for media_type in status_config
    }
    labels = {}
    for media_type, (model, object_id_field, choices, default_label) in status_config.items():
        object_ids = object_ids_by_type[media_type]
        labels[media_type] = {object_id: default_label for object_id in object_ids}
        statuses = model.objects.filter(
            user=user,
            **{f'{object_id_field}__in': object_ids},
        ).values_list(object_id_field, 'status')
        labels[media_type].update({
            object_id: choices.get(status, status)
            for object_id, status in statuses
        })
    return labels


class CollectionSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    contains_item = serializers.SerializerMethodField()
    counts = serializers.SerializerMethodField()
    covers = serializers.SerializerMethodField()
    is_subscribed = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    @staticmethod
    def get_author(collection):
        return serialize_collection_author(collection)

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
            'description',
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
        ordered_content = get_ordered_content(collection)
        status_labels = get_user_status_labels(
            ordered_content,
            self.context.get('progress_user'),
        )
        captions = {
            (item.media_type, item.object_id): item.caption
            for item in collection.item_orders.all()
        }
        serialized_items = []
        for media_type, object_id, item in ordered_content:
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
                    'game_status': item.igdb_game_status,
                    'user_status': status_labels.get(media_type, {}).get(object_id),
                }
            elif media_type == 'movie':
                serialized_item = {
                    'type': 'movie',
                    'id': item.tmdb_id,
                    'order_id': object_id,
                    'name': item.tmdb_name or item.tmdb_original_name,
                    'release_year': item.tmdb_release_date.year if item.tmdb_release_date else None,
                    'cover_url': get_proxy_url(request, item.tmdb_poster_path),
                    'user_status': status_labels.get(media_type, {}).get(object_id),
                }
            else:
                serialized_item = {
                    'type': 'show',
                    'id': item.tmdb_id,
                    'order_id': object_id,
                    'name': item.tmdb_name or item.tmdb_original_name,
                    'release_year': item.tmdb_release_date.year if item.tmdb_release_date else None,
                    'cover_url': get_proxy_url(request, item.tmdb_poster_path),
                    'user_status': status_labels.get(media_type, {}).get(object_id),
                }
            serialized_item['caption'] = captions.get((media_type, object_id), '')
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


class ContainingCollectionSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='collection_id')
    title = serializers.CharField(source='collection.title')
    author = serializers.SerializerMethodField()
    caption = serializers.CharField()
    position = serializers.SerializerMethodField()

    @staticmethod
    def get_author(item_order):
        return serialize_collection_author(item_order.collection)

    @staticmethod
    def get_position(item_order):
        return item_order.position + 1
