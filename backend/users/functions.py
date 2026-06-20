from users.models import User, UserFollow


def is_user_available(current_user, target_user):
    if current_user != target_user:
        if target_user.privacy == target_user.PRIVACY_NOBODY:
            return False

        try:
            current_user_is_followed = UserFollow.objects.get(user=target_user, followed_user=current_user).is_following
        except (UserFollow.DoesNotExist, TypeError):
            current_user_is_followed = False

        if target_user.privacy == target_user.PRIVACY_FOLLOWED and not current_user_is_followed:
            return False

    return True


def get_public_non_followed_user_ids(user):
    followed_user_ids = UserFollow.objects.filter(user=user, is_following=True).values('followed_user')
    return User.objects.filter(privacy=User.PRIVACY_ALL) \
        .exclude(id=user.id) \
        .exclude(id__in=followed_user_ids) \
        .values('id')
