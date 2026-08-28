import time

from django.db import transaction
from django.utils import timezone

from shows.functions import clear_tmdb_show_cache, get_tmdb_show, get_tmdb_show_credits, sync_show_people
from shows.models import Show


def run_show_cast_sync(
        limit=0,
        start_id=0,
        delay=0.25,
        force=False,
        dry_run=False,
        progress_callback=None,
        output_callback=None,
):
    limit = max(int(limit), 0)
    start_id = max(int(start_id), 0)
    delay = max(float(delay), 0.0)
    force = bool(force)
    dry_run = bool(dry_run)

    shows = Show.objects.order_by('id')
    if start_id:
        shows = shows.filter(id__gte=start_id)
    if limit:
        shows = shows[:limit]

    total = shows.count()
    started_at = timezone.now()
    updated_count = 0
    error_count = 0

    _notify_progress(
        progress_callback,
        current=0,
        total=total,
        updated=updated_count,
        errors=error_count,
        current_show='',
        started_at=started_at.isoformat(),
    )

    if total == 0:
        _write_output(output_callback, 'warning', 'No shows to process')
        return _build_summary(
            total=total,
            updated=updated_count,
            errors=error_count,
            dry_run=dry_run,
            started_at=started_at,
        )

    _write_output(
        output_callback,
        'info',
        f'Starting TMDB cast sync for {total} shows '
        f'(dry_run={dry_run}, force={force}, delay={delay:.2f}s)',
    )

    for index, show in enumerate(shows.iterator(chunk_size=100), start=1):
        prefix = f'[{index}/{total}] show_id={show.id} tmdb_id={show.tmdb_id}'
        current_show = get_show_progress_label(show)
        _notify_progress(
            progress_callback,
            current=index - 1,
            total=total,
            updated=updated_count,
            errors=error_count,
            current_show=current_show,
            started_at=started_at.isoformat(),
        )

        if dry_run:
            _write_output(output_callback, 'info', f'{prefix} WOULD_UPDATE')
            _notify_progress(
                progress_callback,
                current=index,
                total=total,
                updated=updated_count,
                errors=error_count,
                current_show=current_show,
                started_at=started_at.isoformat(),
            )
            continue

        if index > 1 and delay:
            time.sleep(delay)

        try:
            if force:
                clear_tmdb_show_cache(show.tmdb_id)

            tmdb_show = get_tmdb_show(show.tmdb_id)
            tmdb_show_credits = get_tmdb_show_credits(show.tmdb_id)
            with transaction.atomic():
                sync_show_people(show, tmdb_show_credits, tmdb_show)

            cast_count = len(tmdb_show_credits.get('cast') or [])
            creator_count = len(tmdb_show.get('created_by') or [])
            updated_count += 1
            _write_output(
                output_callback,
                'success',
                f'{prefix} UPDATED cast={cast_count} creators={creator_count}',
            )
        except Exception as error:
            error_count += 1
            _write_output(output_callback, 'error', f'{prefix} ERROR {error}')

        _notify_progress(
            progress_callback,
            current=index,
            total=total,
            updated=updated_count,
            errors=error_count,
            current_show=current_show,
            started_at=started_at.isoformat(),
        )

    summary = _build_summary(
        total=total,
        updated=updated_count,
        errors=error_count,
        dry_run=dry_run,
        started_at=started_at,
    )
    _write_output(
        output_callback,
        'success',
        f'TMDB cast sync finished in {summary["duration_seconds"]:.1f}s: '
        f'updated={updated_count}, errors={error_count}, total={total}',
    )
    return summary


def get_show_progress_label(show):
    name = show.tmdb_name or show.tmdb_original_name or f'ID {show.id}'
    return f'{name} (TMDB {show.tmdb_id})'


def _notify_progress(progress_callback, **progress):
    if progress_callback is not None:
        progress_callback(progress)


def _write_output(output_callback, level, message):
    if output_callback is not None:
        output_callback(level, message)


def _build_summary(total, updated, errors, dry_run, started_at):
    finished_at = timezone.now()
    return {
        'current': total,
        'total': total,
        'updated': updated,
        'errors': errors,
        'dry_run': dry_run,
        'duration_seconds': round((finished_at - started_at).total_seconds(), 2),
        'started_at': started_at.isoformat(),
        'finished_at': finished_at.isoformat(),
    }
