from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX


def get_movie_new_fields(tmdb_movie):
    result = {
        'imdb_id': tmdb_movie.get('imdb_id') if tmdb_movie.get('imdb_id') is not None else '',
        'tmdb_original_name': tmdb_movie.get('original_title'),
        'tmdb_name': tmdb_movie.get('title'),
        'tmdb_runtime': tmdb_movie.get('runtime') if tmdb_movie.get('runtime') is not None else 0,
        'tmdb_release_date': tmdb_movie.get('release_date') if tmdb_movie.get('release_date') != "" else None,
        'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_movie['backdrop_path']
        if tmdb_movie.get('backdrop_path') is not None else '',
        'tmdb_poster_path': TMDB_POSTER_PATH_PREFIX + tmdb_movie['poster_path']
        if tmdb_movie.get('poster_path') is not None else ''
    }

    return result


# cache keys
def get_tmdb_movie_key(tmdb_id):
    return f'movie_{tmdb_id}'
