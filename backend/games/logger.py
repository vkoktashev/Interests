from games.models import GameLog


def status_changed(user, game, status):
    GameLog.objects.create(user=user, game=game,
                           action_type=GameLog.ACTION_TYPE_STATUS,
                           action_result=status)


def score_changed(user, game, score):
    GameLog.objects.create(user=user, game=game,
                           action_type=GameLog.ACTION_TYPE_SCORE,
                           action_result=score)


def review_changed(user, game, review):
    GameLog.objects.create(user=user, game=game,
                           action_type=GameLog.ACTION_TYPE_REVIEW,
                           action_result=review)
