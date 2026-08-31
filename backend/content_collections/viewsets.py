from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from users.functions import is_user_available

from .media import get_media_item
from .models import Collection
from .selectors import (
    get_collection_author,
    get_collection_queryset,
    get_contained_collection_ids,
    get_content_search_payload,
    get_user,
    search_content,
)
from .serializers import CollectionDetailSerializer, CollectionSerializer
from .services.collections import (
    CollectionInputError,
    CollectionItemNotFoundError,
    add_collection_item,
    clone_collection,
    create_collection,
    remove_collection_item,
    reorder_collection_items,
)


class CollectionViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
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
        try:
            create_collection(
                serializer,
                request.user,
                request.data.get('items', []),
            )
        except CollectionInputError as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_collection_author(self):
        if not hasattr(self, '_collection_author'):
            self._collection_author = get_collection_author(
                self.request.user,
                self.request.query_params.get('author_id'),
            )
        return self._collection_author

    def get_progress_user(self):
        if not hasattr(self, '_progress_user'):
            self._progress_user = get_user(
                self.request.query_params.get('progress_user_id')
            )
        return self._progress_user

    def get_queryset(self):
        author = self.get_collection_author() if self.action == 'list' else None
        progress_user = self.get_progress_user() if self.action in ('list', 'retrieve') else None
        return get_collection_queryset(
            action=self.action,
            request_user=self.request.user,
            author=author,
            progress_user=progress_user,
            ordering=self.request.query_params.get('ordering'),
        )

    def list(self, request, *args, **kwargs):
        author = self.get_collection_author()
        if author is None:
            return Response({'error': 'Пользователь не найден.'}, status=status.HTTP_404_NOT_FOUND)
        if not is_user_available(request.user, author):
            return Response(
                {'error': 'Профиль скрыт настройками приватности.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        progress_error = self._get_progress_access_error(request)
        if progress_error:
            return progress_error
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        collection = self.get_object()
        if collection.author_id is not None and not is_user_available(request.user, collection.author):
            return Response(
                {'error': 'Профиль скрыт настройками приватности.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        progress_error = self._get_progress_access_error(request)
        if progress_error:
            return progress_error
        return Response(self.get_serializer(collection).data)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == 'retrieve':
            context['progress_user'] = self.get_progress_user()
        if self.request.user.is_authenticated:
            context['subscribed_collection_ids'] = set(
                self.request.user.subscribed_collections.values_list('pk', flat=True)
            )
        item, _, error = get_media_item(
            self.request.query_params.get('media_type'),
            self.request.query_params.get('object_id'),
        )
        author = self.get_collection_author()
        if item is not None and error is None and author is not None:
            context['contained_collection_ids'] = get_contained_collection_ids(item, author)
        return context

    @action(detail=True, methods=['post'])
    def add_item(self, request, *args, **kwargs):
        collection = self.get_object()
        try:
            was_added = add_collection_item(
                collection,
                request.data.get('media_type'),
                request.data.get('object_id'),
            )
        except (CollectionInputError, CollectionItemNotFoundError) as error:
            return self._operation_error_response(error)
        return Response({'added': was_added}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def subscribe(self, request, *args, **kwargs):
        collection = self.get_object()
        if collection.author_id == request.user.pk:
            return Response(
                {'error': 'Нельзя подписаться на собственную подборку.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if collection.author_id is not None and not is_user_available(request.user, collection.author):
            return Response(status=status.HTTP_403_FORBIDDEN)

        collection.subscribers.add(request.user)
        return Response({'subscribed': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def unsubscribe(self, request, *args, **kwargs):
        collection = self.get_object()
        if collection.author_id == request.user.pk:
            return Response(
                {'error': 'Нельзя отписаться от собственной подборки.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if collection.author_id is not None and not is_user_available(request.user, collection.author):
            return Response(status=status.HTTP_403_FORBIDDEN)

        collection.subscribers.remove(request.user)
        return Response({'subscribed': False}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def clone(self, request, *args, **kwargs):
        collection = self.get_object()
        if collection.author_id == request.user.pk:
            return Response(
                {'error': 'Нельзя клонировать собственную подборку.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if collection.author_id is not None and not is_user_available(request.user, collection.author):
            return Response(status=status.HTTP_403_FORBIDDEN)

        cloned_collection = clone_collection(collection, request.user)
        return Response(
            {'id': cloned_collection.pk},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'])
    def content_search(self, request, *args, **kwargs):
        query = (request.query_params.get('query') or '').strip()
        return Response(get_content_search_payload(search_content(query), request))

    @action(detail=True, methods=['post'])
    def reorder(self, request, *args, **kwargs):
        try:
            reorder_collection_items(
                self.get_object(),
                request.data.get('items'),
            )
        except CollectionInputError as error:
            return self._operation_error_response(error)
        return Response({'reordered': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def remove_item(self, request, *args, **kwargs):
        try:
            remove_collection_item(
                self.get_object(),
                request.data.get('media_type'),
                request.data.get('object_id'),
            )
        except (CollectionInputError, CollectionItemNotFoundError) as error:
            return self._operation_error_response(error)
        return Response({'removed': True}, status=status.HTTP_200_OK)

    def _get_progress_access_error(self, request):
        progress_user_id = request.query_params.get('progress_user_id')
        progress_user = self.get_progress_user()
        if progress_user_id is not None and progress_user is None:
            return Response(
                {'error': 'Пользователь прогресса не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if progress_user is not None and not is_user_available(request.user, progress_user):
            return Response(
                {'error': 'Профиль прогресса скрыт настройками приватности.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    @staticmethod
    def _operation_error_response(error):
        response_status = (
            status.HTTP_404_NOT_FOUND
            if isinstance(error, CollectionItemNotFoundError)
            else status.HTTP_400_BAD_REQUEST
        )
        return Response({'error': str(error)}, status=response_status)
