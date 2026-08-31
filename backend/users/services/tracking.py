from django.db import transaction

from users.models import UserFollow, UserLog
from users.serializers import SettingsSerializer, UserFollowSerializer


@transaction.atomic
def update_follow(user, followed_user, data):
    serializer_data = data.copy()
    serializer_data.update({'user': user.pk, 'followed_user': followed_user.pk})
    user_follow = UserFollow.objects.filter(user=user, followed_user=followed_user).first()
    serializer = UserFollowSerializer(user_follow, data=serializer_data, partial=True) \
        if user_follow is not None else UserFollowSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    previous_is_following = user_follow.is_following if user_follow is not None else None
    user_follow = serializer.save()
    if previous_is_following is None or previous_is_following != user_follow.is_following:
        UserLog.objects.create(
            user=user_follow.user,
            followed_user=user_follow.followed_user,
            action_type=UserLog.ACTION_TYPE_FOLLOW,
            action_result=user_follow.is_following,
        )
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
