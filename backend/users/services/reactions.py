from collections import defaultdict

from django.contrib.contenttypes.models import ContentType
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from users.functions import is_user_available
from users.models import LogReaction


def get_log_reaction_users(model, log_id, current_user, emoji, page):
    entry = get_object_or_404(model.objects.select_related('user'), pk=log_id)
    if not is_user_available(current_user, entry.user):
        raise PermissionDenied('Профиль пользователя недоступен')

    reactions = LogReaction.objects.filter(
        content_type=ContentType.objects.get_for_model(entry),
        object_id=entry.pk,
        emoji=emoji,
    ).order_by('user__username', 'user_id').values('user_id', 'user__username', 'user__gender', 'reacted_at')
    paginator = Paginator(reactions, 50)
    result_page = paginator.get_page(page)
    return {
        'users': [
            {
                'id': row['user_id'],
                'username': row['user__username'],
                'gender': row['user__gender'],
                'reacted_at': row['reacted_at'],
            }
            for row in result_page
        ],
        'count': paginator.count,
        'next_page': result_page.next_page_number() if result_page.has_next() else None,
    }


def get_log_reactions(logs, current_user=None):
    """Load counts and the viewer's selection for the entire page in one query."""
    if not logs:
        return {}

    content_types = ContentType.objects.get_for_models(*{type(entry) for entry in logs})
    log_ids = defaultdict(list)
    for entry in logs:
        log_ids[content_types[type(entry)].pk].append(entry.pk)

    query = Q()
    for content_type_id, object_ids in log_ids.items():
        query |= Q(content_type_id=content_type_id, object_id__in=object_ids)

    user_id = current_user.pk if current_user and current_user.is_authenticated else None
    rows = LogReaction.objects.filter(query).values('content_type_id', 'object_id', 'emoji').annotate(
        count=Count('pk'),
        selected_count=Count('pk', filter=Q(user_id=user_id)),
    )
    reactions = defaultdict(dict)
    for row in rows:
        reactions[(row['content_type_id'], row['object_id'])][row['emoji']] = {
            'emoji': row['emoji'],
            'count': row['count'],
            'selected': row['selected_count'] > 0,
        }

    result = {}
    for entry in logs:
        grouped = reactions[(content_types[type(entry)].pk, entry.pk)]
        result[(type(entry), entry.pk)] = [
            grouped[emoji] for emoji, _ in LogReaction.EMOJI_CHOICES if emoji in grouped
        ]
    return result


@transaction.atomic
def set_log_reaction(model, log_id, user, emoji):
    # Serialize changes on the target, including concurrent first reactions.
    entry = get_object_or_404(model.objects.select_for_update(of=('self',)).select_related('user'), pk=log_id)
    if not is_user_available(user, entry.user):
        raise PermissionDenied('Профиль пользователя недоступен')

    content_type = ContentType.objects.get_for_model(entry)
    lookup = {'content_type': content_type, 'object_id': entry.pk, 'user': user}
    if emoji is None:
        LogReaction.objects.filter(**lookup).delete()
    else:
        reaction, created = LogReaction.objects.get_or_create(**lookup, defaults={'emoji': emoji})
        if not created and reaction.emoji != emoji:
            reaction.emoji = emoji
            reaction.reacted_at = timezone.now()
            reaction.save(update_fields=('emoji', 'reacted_at'))

    return get_log_reactions([entry], current_user=user)[(type(entry), entry.pk)]
