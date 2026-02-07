import rawgpy
import tmdbsimple as tmdb

rawg = rawgpy.RAWG("b63e6d97a13e480890142f340650aefb")
tmdb.API_KEY = 'ebf9e8e8a2be6bba6aacfa5c4c76f698'
LANGUAGE = 'ru'

TYPE_GAME = 'game'
TYPE_MOVIE = 'movie'
TYPE_SHOW = 'show'
TYPE_SEASON = 'season'
TYPE_EPISODE = 'episode'
TYPE_USER = 'user'

DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_SIZE = 5

SITE_URL = 'localhost:3000'
CACHE_TIMEOUT = 60 * 60 * 10
LAST_ACTIVITY_INTERVAL_SECS = 60 * 10

YOUTUBE_PREFIX = 'https://www.youtube.com/watch?v='
TMDB_BACKDROP_PATH_PREFIX = 'https://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
TMDB_POSTER_PATH_PREFIX = 'https://image.tmdb.org/t/p/w600_and_h900_bestv2'
TMDB_STILL_PATH_PREFIX = 'https://image.tmdb.org/t/p/w1920_and_h1080_bestv2'
EPISODE_NOT_WATCHED_SCORE = -1
EPISODE_WATCHED_SCORE = 0
MINUTES_IN_HOUR = 60

UPDATE_DATES_HOUR = 8
UPDATE_DATES_MINUTE = 58

# errors
ERROR = 'error'
RAWG_UNAVAILABLE = 'RAWG недоступен.'
HLTB_UNAVAILABLE = 'HLTB недоступен.'
GAME_NOT_FOUND = "Игра не найдена."
MOVIE_NOT_FOUND = "Фильм не найден."
TMDB_UNAVAILABLE = "TMDB недоступен."
USER_EMAIL_EXISTS = 'Пользователь с такой электронной почтой уже существует.'
USER_USERNAME_EXISTS = 'Пользователь с таким никнеймом уже существует.'
USERNAME_CONTAINS_ILLEGAL_CHARACTERS = 'Никнейм содержит недопустимые символы.'
WRONG_URL = 'Неверная ссылка.'
ID_VALUE_ERROR = 'Неверный ID, должен быть целым числом.'
USER_NOT_FOUND = 'Пользователь не найден.'
SHOW_NOT_FOUND = "Сериал не найден."
SEASON_NOT_FOUND = 'Сезон не найден.'
EPISODE_NOT_FOUND = 'Эпизод не найден.'
EMAIL_ERROR = 'Возникла проблема с отправкой письма, попробуйте позже.'
WRONG_BACKDROP_PATH = 'Недопустимый фон профиля.'
CANNOT_DELETE_ANOTHER_USER_LOG = 'Нельзя удалять логи других пользователей.'
WRONG_LOG_TYPE = 'Недопустимый тип логов.'
LOG_NOT_FOUND = 'Лог не найден.'
CANNOT_REACT_TO_OWN_LOG = 'Нельзя ставить реакции на свои логи.'
WRONG_REACTION = 'Недопустимая реакция.'

LOG_REACTIONS = ('🤡', '😳', '👍', '😡', '😁', '🤨')
