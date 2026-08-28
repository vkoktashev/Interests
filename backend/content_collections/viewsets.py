from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from django.contrib.postgres.search import TrigramSimilarity
from django.db import transaction
from django.db.models import Count, Max, Q
from django.db.models.functions import Greatest

from games.models import Game, UserGame
from movies.models import Movie, UserMovie
from shows.models import Show, UserShow
from proxy.functions import get_proxy_url
from users.functions import is_user_available
from users.models import User
from utils.constants import TYPE_GAME, TYPE_MOVIE, TYPE_SHOW
from .models import Collection, CollectionItemOrder
from .serializers import CollectionDetailSerializer, CollectionSerializer


MEDIA_CONFIG = {
    TYPE_GAME: (Game, 'pk', 'games'),
    TYPE_MOVIE: (Movie, 'pk', 'movies'),
    TYPE_SHOW: (Show, 'pk', 'shows'),
}
ALLOWED_ORDERING = ('created_at', '-created_at', 'updated_at', '-updated_at')


def get_media_item(media_type, object_id):
    config = MEDIA_CONFIG.get(media_type)
    if config is None:
        return None, None, 'Неизвестный тип контента.'

    try:
        normalized_object_id = int(object_id)
    except (TypeError, ValueError):
        return None, None, 'Некорректный идентификатор контента.'

    model, lookup_field, relation_name = config
    item = model.objects.filter(**{lookup_field: normalized_object_id}).first()
    if item is None:
        return None, None, 'Контент не найден.'

    return item, relation_name, None


def annotate_progress(queryset, progress_user):
    return queryset.annotate(
        completed_games_count=Count(
            'games',
            filter=Q(
                games__usergame__user=progress_user,
                games__usergame__status=UserGame.STATUS_COMPLETED,
            ),
            distinct=True,
        ),
        watched_movies_count=Count(
            'movies',
            filter=Q(
                movies__usermovie__user=progress_user,
                movies__usermovie__status=UserMovie.STATUS_WATCHED,
            ),
            distinct=True,
        ),
        watched_shows_count=Count(
            'shows',
            filter=Q(
                shows__usershow__user=progress_user,
                shows__usershow__status=UserShow.STATUS_WATCHED,
            ),
            distinct=True,
        ),
    )


def get_collection_content_keys(collection):
    media_groups = (
        [(TYPE_GAME, game.pk) for game in collection.games.all()],
        [(TYPE_MOVIE, movie.pk) for movie in collection.movies.all()],
        [(TYPE_SHOW, show.pk) for show in collection.shows.all()],
    )
    content_keys = []
    item_index = 0
    while any(item_index < len(group) for group in media_groups):
        for group in media_groups:
            if item_index < len(group):
                content_keys.append(group[item_index])
        item_index += 1
    return content_keys


def sync_collection_item_orders(collection):
    existing_keys = set(
        collection.item_orders.values_list('media_type', 'object_id')
    )
    max_position = collection.item_orders.aggregate(max_position=Max('position'))['max_position']
    next_position = 0 if max_position is None else max_position + 1
    missing_orders = []
    for media_type, object_id in get_collection_content_keys(collection):
        if (media_type, object_id) not in existing_keys:
            missing_orders.append(CollectionItemOrder(
                collection=collection,
                media_type=media_type,
                object_id=object_id,
                position=next_position,
            ))
            next_position += 1
    if missing_orders:
        CollectionItemOrder.objects.bulk_create(missing_orders)


def resolve_requested_content(items):
    if not isinstance(items, list):
        return None, 'Список контента имеет неверный формат.'

    resolved_items = []
    seen_keys = set()
    for item_data in items:
        if not isinstance(item_data, dict) or item_data.get('media_type') not in MEDIA_CONFIG:
            return None, 'Некорректный элемент подборки.'
        try:
            object_id = int(item_data.get('object_id'))
        except (TypeError, ValueError):
            return None, 'Некорректный элемент подборки.'

        media_type = item_data['media_type']
        item_key = (media_type, object_id)
        if item_key in seen_keys:
            return None, 'Контент в подборке не должен повторяться.'

        model, _, relation_name = MEDIA_CONFIG[media_type]
        item = model.objects.filter(pk=object_id).first()
        if item is None:
            return None, 'Один из элементов контента не найден.'

        seen_keys.add(item_key)
        resolved_items.append((media_type, object_id, relation_name, item))

    return resolved_items, None


class CollectionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    queryset = Collection.objects.all()
    serializer_class = CollectionSerializer
    permission_classes = (IsAuthenticated,)

    def get_permissions(self):
        permission_classes = (AllowAny,) if self.action in ('list', 'retrieve') else self.permission_classes
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action in ('retrieve', 'update', 'partial_update'):
            return CollectionDetailSerializer
        return CollectionSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resolved_items, error = resolve_requested_content(request.data.get('items', []))
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            collection = serializer.save(author=request.user)
            relation_items = {'games': [], 'movies': [], 'shows': []}
            for _, _, relation_name, item in resolved_items:
                relation_items[relation_name].append(item)
            for relation_name, items in relation_items.items():
                if items:
                    getattr(collection, relation_name).add(*items)

            CollectionItemOrder.objects.bulk_create([
                CollectionItemOrder(
                    collection=collection,
                    media_type=media_type,
                    object_id=object_id,
                    position=position,
                )
                for position, (media_type, object_id, _, _) in enumerate(resolved_items)
            ])

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_collection_author(self):
        if hasattr(self, '_collection_author'):
            return self._collection_author

        author_id = self.request.query_params.get('author_id')
        if author_id is None and self.request.user.is_authenticated:
            self._collection_author = self.request.user
            return self._collection_author

        try:
            normalized_author_id = int(author_id)
        except (TypeError, ValueError):
            self._collection_author = None
            return None

        self._collection_author = User.objects.filter(pk=normalized_author_id).first()
        return self._collection_author

    def get_progress_user(self):
        if hasattr(self, '_progress_user'):
            return self._progress_user

        progress_user_id = self.request.query_params.get('progress_user_id')
        if progress_user_id is None:
            self._progress_user = None
            return None

        try:
            normalized_user_id = int(progress_user_id)
        except (TypeError, ValueError):
            self._progress_user = None
            return None

        self._progress_user = User.objects.filter(pk=normalized_user_id).first()
        return self._progress_user

    def get_queryset(self):
        if self.action == 'retrieve':
            queryset = (
                Collection.objects
                .select_related('author')
                .prefetch_related('games', 'movies', 'shows', 'item_orders')
            )
            if self.request.user.is_authenticated:
                queryset = queryset.filter(
                    Q(privacy=Collection.PRIVACY_PUBLIC) | Q(author=self.request.user)
                )
            else:
                queryset = queryset.filter(privacy=Collection.PRIVACY_PUBLIC)

            progress_user = self.get_progress_user()
            return annotate_progress(queryset, progress_user) if progress_user is not None else queryset

        if self.action in ('update', 'partial_update', 'add_item', 'remove_item', 'reorder'):
            return (
                Collection.objects
                .filter(author=self.request.user)
                .select_related('author')
                .prefetch_related('games', 'movies', 'shows', 'item_orders')
            )

        author = self.get_collection_author()
        if author is None:
            return Collection.objects.none()

        ordering = self.request.query_params.get('ordering', '-updated_at')
        if ordering not in ALLOWED_ORDERING:
            ordering = '-updated_at'

        queryset = (
            Collection.objects
            .filter(author=author)
            .prefetch_related('games', 'movies', 'shows', 'item_orders')
            .order_by(ordering, '-id')
        )
        if not self.request.user.is_authenticated or self.request.user.pk != author.pk:
            queryset = queryset.filter(privacy=Collection.PRIVACY_PUBLIC)

        progress_user = self.get_progress_user()
        if progress_user is not None:
            queryset = annotate_progress(queryset, progress_user)

        return queryset

    def list(self, request, *args, **kwargs):
        author = self.get_collection_author()
        if author is None:
            return Response({'error': 'Пользователь не найден.'}, status=status.HTTP_404_NOT_FOUND)
        if not is_user_available(request.user, author):
            return Response({'error': 'Профиль скрыт настройками приватности.'}, status=status.HTTP_403_FORBIDDEN)

        progress_user_id = request.query_params.get('progress_user_id')
        progress_user = self.get_progress_user()
        if progress_user_id is not None and progress_user is None:
            return Response({'error': 'Пользователь прогресса не найден.'}, status=status.HTTP_404_NOT_FOUND)
        if progress_user is not None and not is_user_available(request.user, progress_user):
            return Response({'error': 'Профиль прогресса скрыт настройками приватности.'}, status=status.HTTP_403_FORBIDDEN)

        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        collection = self.get_object()
        if not is_user_available(request.user, collection.author):
            return Response({'error': 'Профиль скрыт настройками приватности.'}, status=status.HTTP_403_FORBIDDEN)

        progress_user_id = request.query_params.get('progress_user_id')
        progress_user = self.get_progress_user()
        if progress_user_id is not None and progress_user is None:
            return Response({'error': 'Пользователь прогресса не найден.'}, status=status.HTTP_404_NOT_FOUND)
        if progress_user is not None and not is_user_available(request.user, progress_user):
            return Response(
                {'error': 'Профиль прогресса скрыт настройками приватности.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(collection)
        return Response(serializer.data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        media_type = self.request.query_params.get('media_type')
        object_id = self.request.query_params.get('object_id')
        item, _, error = get_media_item(media_type, object_id)

        author = self.get_collection_author()
        if item is not None and error is None and author is not None:
            context['contained_collection_ids'] = set(
                item.collections.filter(author=author).values_list('pk', flat=True)
            )

        return context

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'])
    def add_item(self, request, *args, **kwargs):
        collection = self.get_object()
        media_type = request.data.get('media_type')
        item, relation_name, error = get_media_item(
            media_type,
            request.data.get('object_id'),
        )
        if error:
            response_status = status.HTTP_404_NOT_FOUND if error == 'Контент не найден.' else status.HTTP_400_BAD_REQUEST
            return Response({'error': error}, status=response_status)

        relation = getattr(collection, relation_name)
        was_added = not relation.filter(pk=item.pk).exists()
        sync_collection_item_orders(collection)
        if was_added:
            relation.add(item)
            max_position = collection.item_orders.aggregate(max_position=Max('position'))['max_position']
            next_position = 0 if max_position is None else max_position + 1
            CollectionItemOrder.objects.create(
                collection=collection,
                media_type=media_type,
                object_id=item.pk,
                position=next_position,
            )
            collection.save(update_fields=('updated_at',))

        return Response({'added': was_added}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def content_search(self, request, *args, **kwargs):
        query = (request.query_params.get('query') or '').strip()
        if not query:
            return Response({'games': [], 'movies': [], 'shows': []})

        games = (
            Game.objects
            .annotate(similarity=Greatest(
                TrigramSimilarity('igdb_name', query),
                TrigramSimilarity('hltb_name', query),
                TrigramSimilarity('igdb_slug', query),
            ))
            .filter(
                Q(igdb_name__icontains=query)
                | Q(hltb_name__icontains=query)
                | Q(igdb_slug__icontains=query)
                | Q(similarity__gt=0.1)
            )
            .order_by('-similarity', 'igdb_name')[:5]
        )
        movies = (
            Movie.objects
            .annotate(similarity=Greatest(
                TrigramSimilarity('tmdb_name', query),
                TrigramSimilarity('tmdb_original_name', query),
            ))
            .filter(
                Q(tmdb_name__icontains=query)
                | Q(tmdb_original_name__icontains=query)
                | Q(similarity__gt=0.1)
            )
            .order_by('-similarity', 'tmdb_name')[:5]
        )
        shows = (
            Show.objects
            .annotate(similarity=Greatest(
                TrigramSimilarity('tmdb_name', query),
                TrigramSimilarity('tmdb_original_name', query),
            ))
            .filter(
                Q(tmdb_name__icontains=query)
                | Q(tmdb_original_name__icontains=query)
                | Q(similarity__gt=0.1)
            )
            .order_by('-similarity', 'tmdb_name')[:5]
        )

        return Response({
            'games': [
                {
                    'type': TYPE_GAME,
                    'object_id': game.pk,
                    'name': game.igdb_name or game.hltb_name or game.igdb_slug,
                    'release_year': game.igdb_year or (
                        game.igdb_release_date.year if game.igdb_release_date else None
                    ),
                    'cover_url': get_proxy_url(request, game.igdb_cover_url),
                }
                for game in games
            ],
            'movies': [
                {
                    'type': TYPE_MOVIE,
                    'object_id': movie.pk,
                    'name': movie.tmdb_name or movie.tmdb_original_name,
                    'release_year': movie.tmdb_release_date.year if movie.tmdb_release_date else None,
                    'cover_url': get_proxy_url(request, movie.tmdb_poster_path),
                }
                for movie in movies
            ],
            'shows': [
                {
                    'type': TYPE_SHOW,
                    'object_id': show.pk,
                    'name': show.tmdb_name or show.tmdb_original_name,
                    'release_year': show.tmdb_release_date.year if show.tmdb_release_date else None,
                    'cover_url': get_proxy_url(request, show.tmdb_poster_path),
                }
                for show in shows
            ],
        })

    @action(detail=True, methods=['post'])
    def reorder(self, request, *args, **kwargs):
        collection = self.get_object()
        items = request.data.get('items')
        if not isinstance(items, list):
            return Response(
                {'error': 'Порядок элементов должен быть списком.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_items = []
        for item in items:
            if not isinstance(item, dict) or item.get('media_type') not in MEDIA_CONFIG:
                return Response(
                    {'error': 'Некорректный элемент подборки.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                object_id = int(item.get('object_id'))
            except (TypeError, ValueError):
                return Response(
                    {'error': 'Некорректный элемент подборки.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            normalized_items.append((item['media_type'], object_id))

        expected_items = set(get_collection_content_keys(collection))
        if len(normalized_items) != len(expected_items) or set(normalized_items) != expected_items:
            return Response(
                {'error': 'Порядок должен содержать все элементы подборки без повторов.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            collection.item_orders.all().delete()
            CollectionItemOrder.objects.bulk_create([
                CollectionItemOrder(
                    collection=collection,
                    media_type=media_type,
                    object_id=object_id,
                    position=position,
                )
                for position, (media_type, object_id) in enumerate(normalized_items)
            ])
            collection.save(update_fields=('updated_at',))

        return Response({'reordered': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def remove_item(self, request, *args, **kwargs):
        collection = self.get_object()
        media_type = request.data.get('media_type')
        config = MEDIA_CONFIG.get(media_type)
        if config is None:
            return Response(
                {'error': 'Неизвестный тип контента.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            object_id = int(request.data.get('object_id'))
        except (TypeError, ValueError):
            return Response(
                {'error': 'Некорректный идентификатор контента.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model, _, relation_name = config
        item = model.objects.filter(pk=object_id).first()
        relation = getattr(collection, relation_name)
        if item is None or not relation.filter(pk=object_id).exists():
            return Response(
                {'error': 'Элемент не найден в подборке.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            relation.remove(item)
            collection.item_orders.filter(
                media_type=media_type,
                object_id=object_id,
            ).delete()
            collection.save(update_fields=('updated_at',))

        return Response({'removed': True}, status=status.HTTP_200_OK)
