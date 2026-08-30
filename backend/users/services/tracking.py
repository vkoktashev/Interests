from django.db import transaction

from users.models import UserFollow
from users.serializers import SettingsSerializer, UserFollowSerializer


@transaction.atomic
def update_follow(user, followed_user, data):
    serializer_data = data.copy()
    serializer_data.update({'user': user.pk, 'followed_user': followed_user.pk})
    user_follow = UserFollow.objects.filter(user=user, followed_user=followed_user).first()
    serializer = UserFollowSerializer(user_follow, data=serializer_data, partial=True) \
        if user_follow is not None else UserFollowSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return serializer.data


@transaction.atomic
def update_user_settings(user, data):
    serializer = SettingsSerializer(user, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    if user.privacy == user.PRIVACY_NOBODY:
        UserFollow.objects.filter(followed_user=user).update(is_following=False)
    elif user.privacy == user.PRIVACY_FOLLOWED:
        followed_user_ids = UserFollow.objects.filter(
            user=user,
            is_following=True,
        ).values('followed_user')
        UserFollow.objects.filter(followed_user=user) \
            .exclude(user__in=followed_user_ids).update(is_following=False)
    return serializer.data
