from django.db import transaction

from utils.constants import TMDB_TRAILER_TYPE, YOUTUBE_PREFIX
from videos.models import Video


def sync_tmdb_videos(owner, relation_model, tmdb_videos):
    owner_field = owner._meta.model_name

    videos_by_url = {}
    for sort_order, tmdb_video in enumerate(tmdb_videos or []):
        if tmdb_video.get('type') != TMDB_TRAILER_TYPE:
            continue
        platform = tmdb_video.get('site') or ''
        video_key = tmdb_video.get('key')
        if platform != 'YouTube' or not video_key:
            continue

        url = YOUTUBE_PREFIX + video_key
        videos_by_url.setdefault(url, {
            'external_id': str(tmdb_video.get('id') or ''),
            'name': tmdb_video.get('name') or '',
            'source': Video.SOURCE_TMDB,
            'platform': platform,
            'type': tmdb_video.get('type') or '',
            'sort_order': sort_order,
        })

    owner_filter = {owner_field: owner}
    with transaction.atomic():
        existing_relations = {
            relation.video.url: relation
            for relation in relation_model.objects.filter(
                **owner_filter, video__source=Video.SOURCE_TMDB,
            ).select_related('video')
        }
        active_relation_ids = []

        for url, fields in videos_by_url.items():
            sort_order = fields['sort_order']
            video_fields = {
                field: value
                for field, value in fields.items()
                if field != 'sort_order'
            }
            video, _ = Video.objects.get_or_create(
                source=Video.SOURCE_TMDB,
                url=url,
                defaults=video_fields,
            )

            changed_fields = []
            for field, value in video_fields.items():
                if getattr(video, field) != value:
                    setattr(video, field, value)
                    changed_fields.append(field)
            if changed_fields:
                video.save(update_fields=changed_fields)

            relation = existing_relations.get(url)
            if relation is None:
                relation, _ = relation_model.objects.get_or_create(
                    **owner_filter,
                    video=video,
                    defaults={'sort_order': sort_order},
                )
            if relation.sort_order != sort_order:
                relation.sort_order = sort_order
                relation.save(update_fields=('sort_order',))
            active_relation_ids.append(relation.id)

        relation_model.objects.filter(
            **owner_filter,
            video__source=Video.SOURCE_TMDB,
        ).exclude(id__in=active_relation_ids).delete()


def serialize_videos(owner, relation_model):
    owner_field = owner._meta.model_name
    relations = relation_model.objects.filter(
        **{owner_field: owner},
    ).select_related('video').order_by('sort_order', 'id')

    return [
        {
            'external_id': relation.video.external_id,
            'name': relation.video.name,
            'url': relation.video.url,
            'source': relation.video.source,
            'platform': relation.video.platform,
            'type': relation.video.type,
        }
        for relation in relations
    ]


def serialize_tmdb_videos(tmdb_videos):
    results = []
    seen_urls = set()
    for tmdb_video in tmdb_videos or []:
        if tmdb_video.get('type') != TMDB_TRAILER_TYPE:
            continue
        platform = tmdb_video.get('site') or ''
        video_key = tmdb_video.get('key')
        if platform != 'YouTube' or not video_key:
            continue

        url = YOUTUBE_PREFIX + video_key
        if url in seen_urls:
            continue
        seen_urls.add(url)
        results.append({
            'external_id': str(tmdb_video.get('id') or ''),
            'name': tmdb_video.get('name') or '',
            'url': url,
            'source': Video.SOURCE_TMDB,
            'platform': platform,
            'type': tmdb_video.get('type') or '',
        })
    return results
