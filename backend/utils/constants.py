import rawgpy
import tmdbsimple as tmdb

rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
tmdb.API_KEY = 'ebf9e8e8a2be6bba6aacfa5c4c76f698'
LANGUAGE = 'ru'

DEFAULT_PAGE_NUMBER = 1
DEFAULT_PAGE_SIZE = 5

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