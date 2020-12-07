from django.contrib import admin
from .models import User, UserLog, UserFollow, UserPasswordToken
# Register your models here.
admin.site.register(User)
admin.site.register(UserLog)
admin.site.register(UserFollow)
admin.site.register(UserPasswordToken)