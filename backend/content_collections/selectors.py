from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Count, Q
from django.db.models.functions import Greatest

from games.models import Game, UserGame
from movies.models import Movie, UserMovie
from proxy.functions import get_proxy_url
from shows.models import Show, UserShow
from users.models import User
from utils.constants import TYPE_GAME, TYPE_MOVIE, TYPE_SHOW

from .models import Collection


ALLOWED_ORDERING = ('created_at', '-created_at', 'updated_at', '-updated_at')


def get_user(user_id):
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    return User.objects.filter(pk=user_id).first()


def get_collection_author(request_user, author_id):
    if author_id is None and request_user.is_authenticated:
        return request_user
    return get_user(author_id)


def get_collection_queryset(action, request_user, author=None, progress_user=None, ordering=None):
    if action in ('retrieve', 'subscribe', 'unsubscribe', 'clone'):
        queryset = (
            Collection.objects
            .select_related('author')
            .prefetch_related('games', 'movies', 'shows', 'item_orders')
        )
        if request_user.is_authenticated:
            queryset = queryset.filter(
                Q(privacy=Collection.PRIVACY_PUBLIC) | Q(author=request_user)
            )
        else:
            queryset = queryset.filter(privacy=Collection.PRIVACY_PUBLIC)
        return _annotate_progress(queryset, progress_user) if progress_user else queryset

    if action in ('update', 'partial_update', 'destroy', 'add_item', 'remove_item', 'reorder'):
        return (
            Collection.objects
            .filter(author=request_user)
            .select_related('author')
            .prefetch_related('games', 'movies', 'shows', 'item_orders')
        )

    if author is None:
        return Collection.objects.none()

    if ordering not in ALLOWED_ORDERING:
        ordering = '-updated_at'
    queryset = (
        Collection.objects
        .filter(Q(author=author) | Q(subscribers=author))
        .select_related('author')
        .prefetch_related('games', 'movies', 'shows', 'item_orders')
        .distinct()
        .order_by(ordering, '-id')
    )
    if request_user.is_authenticated:
        queryset = queryset.filter(
            Q(privacy=Collection.PRIVACY_PUBLIC) | Q(author=request_user)
        )
        available_author_ids = User.objects.filter(
            Q(pk=request_user.pk)
            | Q(privacy=User.PRIVACY_ALL)
            | Q(
                privacy=User.PRIVACY_FOLLOWED,
                user__followed_user=request_user,
                user__is_following=True,
            )
        ).values('pk')
    else:
        queryset = queryset.filter(privacy=Collection.PRIVACY_PUBLIC)
        available_author_ids = User.objects.filter(privacy=User.PRIVACY_ALL).values('pk')
    queryset = queryset.filter(author_id__in=available_author_ids)
    return _annotate_progress(queryset, progress_user) if progress_user else queryset


def get_contained_collection_ids(item, author):
    return set(item.collections.filter(author=author).values_list('pk', flat=True))


def search_content(query):
    if not query:
        return {'games': (), 'movies': (), 'shows': ()}

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
    return {'games': games, 'movies': movies, 'shows': shows}


def get_content_search_payload(search_results, request):
    return {
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
            for game in search_results['games']
        ],
        'movies': [
            {
                'type': TYPE_MOVIE,
                'object_id': movie.pk,
                'name': movie.tmdb_name or movie.tmdb_original_name,
                'release_year': movie.tmdb_release_date.year if movie.tmdb_release_date else None,
                'cover_url': get_proxy_url(request, movie.tmdb_poster_path),
            }
            for movie in search_results['movies']
        ],
        'shows': [
            {
                'type': TYPE_SHOW,
                'object_id': show.pk,
                'name': show.tmdb_name or show.tmdb_original_name,
                'release_year': show.tmdb_release_date.year if show.tmdb_release_date else None,
                'cover_url': get_proxy_url(request, show.tmdb_poster_path),
            }
            for show in search_results['shows']
        ],
    }


def _annotate_progress(queryset, progress_user):
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
