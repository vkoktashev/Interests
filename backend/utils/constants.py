import rawgpy
import tmdbsimple as tmdb
import requests

rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
tmdb.API_KEY = 'ebf9e8e8a2be6bba6aacfa5c4c76f698'
address = '144.217.101.245:3129'
proxies = {
    'http': f'http://{address}',
    'https': f'http://{address}',
    'socks5': f'http://{address}'
}
tmdb.REQUESTS_SESSION = requests.session().proxies.update(proxies)
LANGUAGE = 'ru'

DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_SIZE = 5

SITE_URL = 'localhost:3000'
CACHE_TIMEOUT = 60 * 60 * 10
LAST_ACTIVITY_INTERVAL_SECS = 60 * 10

TMDB_BACKDROP_PATH_PREFIX = 'http://image.tmdb.org/t/p/w1920_and_h800_multi_faces'
TMDB_POSTER_PATH_PREFIX = 'http://image.tmdb.org/t/p/w600_and_h900_bestv2'
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
