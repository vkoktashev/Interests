from games.models import GameLog, UserGame


def status_changed(user, game, status):
    message = dict(UserGame.GAME_STATUS_CHOICES)[status].lower()
    GameLog.objects.create(user=user, game=game, message=message)


def score_changed(user, game, score):
    message = f'rated {score} the game'
    GameLog.objects.create(user=user, game=game, message=message)


def review_changed(user, game, review):
    message = f'wrote review for game'
    GameLog.objects.create(user=user, game=game, message=message)
