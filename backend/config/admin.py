from django.contrib import admin

from games.models import UserGameScore, Game
from users.models import User

admin.register(User)
admin.register(Game)
admin.register(UserGameScore)
