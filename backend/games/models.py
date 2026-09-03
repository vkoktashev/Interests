from games.models_parts.game import Game, Genre, Store
from games.models_parts.relations import (
    GameGenre,
    GameStore,
    GameDeveloper,
    GamePublisher,
    GameVideo,
    GameScreenshot,
    GameBeatTime,
)
from games.models_parts.user import UserGame, GameLog

__all__ = [
    'Game',
    'Genre',
    'Store',
    'GameGenre',
    'GameStore',
    'GameDeveloper',
    'GamePublisher',
    'GameVideo',
    'GameScreenshot',
    'GameBeatTime',
    'UserGame',
    'GameLog',
]
