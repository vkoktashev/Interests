from datetime import datetime
import logging

from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.utils import timezone
from django.utils.html import escape

from config.celery import app
from config.settings import EMAIL_HOST_USER, FRONTEND_URL
from games.models import Game, UserGame
from integrations import telegram
from movies.models import Movie, UserMovie
from people.models import PersonCredit
from shows.models import Episode, Show, ShowStatusChange, UserShow
from users.models import User
from users.services.telegram import disable_unavailable_chat
from utils.celery import execute_locked_task

logger = logging.getLogger(__name__)

PERSON_CREDIT_ROLE_LABELS = {
    PersonCredit.ROLE_ACTOR: 'актёр',
    PersonCredit.ROLE_DIRECTOR: 'режиссёр',
    PersonCredit.ROLE_CREATOR: 'создатель',
}


@app.task
def send_release_emails():
    today_date = datetime.today().date()
    return execute_locked_task(
        'send_release_emails',
        today_date.isoformat(),
        lambda: _send_release_emails(today_date),
        timeout=60 * 60,
    )


def _send_release_emails(today_date):
    context = {
        'today_date': today_date,
        'games': Game.objects.filter(
            igdb_release_date=today_date,
            igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_EXACT,
        ),
        'movies': Movie.objects.filter(tmdb_release_date=today_date),
        'digital_movies': Movie.objects.filter(tmdb_digital_release_date=today_date),
        'episodes': Episode.objects.filter(tmdb_release_date=today_date),
        'person_credits': PersonCredit.objects.filter(release_date=today_date),
        'status_changes': list(
            ShowStatusChange.objects.filter(emailed_at=None).select_related('show')
        ),
    }
    pending_status_change_ids = [change.id for change in context['status_changes']]
    users = User.objects.filter(Q(receive_episodes_releases=True) |
                                Q(receive_games_releases=True) |
                                Q(receive_movies_releases=True) |
                                Q(receive_movies_digital_releases=True) |
                                Q(receive_people_releases=True) |
                                Q(receive_show_status_changes=True)) \
        .filter(Q(notify_by_email=True) | Q(notify_by_telegram=True, telegram_chat_id__isnull=False))
    candidates_count = users.count()
    sent_count = 0
    skipped_count = 0
    failed_count = 0
    emails_sent_count = 0
    telegram_sent_count = 0

    logger.info(
        'send_release_emails: start today=%s users=%s games=%s movies=%s digital_movies=%s episodes=%s '
        'person_credits=%s status_changes=%s',
        today_date,
        candidates_count,
        context['games'].count(),
        context['movies'].count(),
        context['digital_movies'].count(),
        context['episodes'].count(),
        context['person_credits'].count(),
        len(context['status_changes']),
    )

    for user in users:
        logger.debug('send_release_emails: processing user id=%s username=%s', user.id, user.username)
        sections, counts = _build_user_sections(user, context)
        if not sections:
            skipped_count += 1
            logger.debug('send_release_emails: skipped user id=%s username=%s reason=no_releases', user.id, user.username)
            continue

        subject, introduction_text = _get_subject_and_introduction(counts)
        delivered = False

        if user.notify_by_email:
            try:
                _send_email_notification(user, subject, introduction_text, sections)
            except Exception:
                failed_count += 1
                logger.exception(
                    'send_release_emails: failed to send email user id=%s username=%s counts=%s',
                    user.id,
                    user.username,
                    counts,
                )
            else:
                delivered = True
                emails_sent_count += 1

        if user.notify_by_telegram and user.telegram_chat_id is not None:
            try:
                _send_telegram_notification(user, subject, introduction_text, sections)
            except telegram.TelegramChatUnavailableError:
                failed_count += 1
                disable_unavailable_chat(user)
            except telegram.TelegramError as error:
                failed_count += 1
                logger.error(
                    'send_release_emails: failed to send telegram user id=%s username=%s counts=%s error=%s',
                    user.id,
                    user.username,
                    counts,
                    error.description,
                )
            else:
                delivered = True
                telegram_sent_count += 1

        if delivered:
            sent_count += 1
            logger.debug(
                'send_release_emails: sent user id=%s username=%s counts=%s',
                user.id,
                user.username,
                counts,
            )

    if pending_status_change_ids:
        ShowStatusChange.objects.filter(
            id__in=pending_status_change_ids,
            emailed_at=None,
        ).update(emailed_at=timezone.now())

    logger.info(
        'send_release_emails: finish users=%s sent=%s emails=%s telegram=%s skipped=%s failed=%s',
        candidates_count,
        sent_count,
        emails_sent_count,
        telegram_sent_count,
        skipped_count,
        failed_count,
    )
    return {
        'candidates': candidates_count,
        'sent': sent_count,
        'emails_sent': emails_sent_count,
        'telegram_sent': telegram_sent_count,
        'skipped': skipped_count,
        'errors': failed_count,
    }


def _build_user_sections(user, context):
    sections = []
    counts = {}
    today_date = context['today_date']

    if user.receive_games_releases:
        games = context['games'].filter(usergame__user=user) \
            .exclude(usergame__status=UserGame.STATUS_NOT_PLAYED) \
            .exclude(usergame__status=UserGame.STATUS_STOPPED)
        _add_section(sections, counts, 'games', 'Новые игры', [
            [_link(game.igdb_name, f'{FRONTEND_URL}/game/{game.igdb_slug}/')]
            for game in games
        ])

    if user.receive_movies_releases:
        movies = context['movies'].filter(usermovie__user=user) \
            .exclude(usermovie__status=UserMovie.STATUS_NOT_WATCHED) \
            .exclude(usermovie__status=UserMovie.STATUS_STOPPED)
        _add_section(sections, counts, 'movies', 'Новые фильмы', [
            [_link(movie.tmdb_name, f'{FRONTEND_URL}/movie/{movie.tmdb_id}/')]
            for movie in movies
        ])

    if user.receive_movies_digital_releases:
        digital_movies = context['digital_movies'].filter(usermovie__user=user) \
            .exclude(usermovie__status=UserMovie.STATUS_NOT_WATCHED) \
            .exclude(usermovie__status=UserMovie.STATUS_STOPPED)
        if user.receive_movies_releases:
            digital_movies = digital_movies.exclude(tmdb_release_date=today_date)
        _add_section(sections, counts, 'digital_movies', 'Цифровые релизы фильмов', [
            [_link(movie.tmdb_name, f'{FRONTEND_URL}/movie/{movie.tmdb_id}/')]
            for movie in digital_movies
        ])

    if user.receive_episodes_releases:
        shows = Show.objects.filter(usershow__user=user) \
            .exclude(usershow__status=UserShow.STATUS_NOT_WATCHED) \
            .exclude(usershow__status=UserShow.STATUS_STOPPED)
        episodes = context['episodes'].select_related('tmdb_season', 'tmdb_season__tmdb_show') \
            .filter(tmdb_season__tmdb_show__in=shows)
        _add_section(sections, counts, 'episodes', 'Новые эпизоды', [
            _get_episode_item(episode)
            for episode in episodes
        ])

    if user.receive_people_releases:
        items, credits_count = _get_people_releases_items(user, context['person_credits'])
        _add_section(sections, counts, 'person_credits', 'Новые работы отслеживаемых людей', items,
                     count=credits_count)

    if user.receive_show_status_changes:
        tracked_show_ids = set(
            UserShow.objects.filter(
                user=user,
                status__in=(
                    UserShow.STATUS_GOING,
                    UserShow.STATUS_WATCHING,
                    UserShow.STATUS_WATCHED,
                ),
            ).values_list('show_id', flat=True)
        )
        _add_section(sections, counts, 'status_changes', 'Изменения сериалов', [
            _get_show_status_change_item(status_change)
            for status_change in context['status_changes']
            if status_change.show_id in tracked_show_ids
        ])

    return sections, counts


def _add_section(sections, counts, code, title, items, count=None):
    counts[code] = len(items) if count is None else count
    if items:
        sections.append({'title': title, 'items': items})


def _get_subject_and_introduction(counts):
    has_status_changes = bool(counts.get('status_changes'))
    has_releases = any(count for code, count in counts.items() if code != 'status_changes')
    if has_releases and has_status_changes:
        return 'Новые релизы и изменения сериалов!', 'Напоминаем о сегодняшних релизах и изменениях сериалов.'
    if has_status_changes:
        return 'Изменения сериалов!', 'Рассказываем об изменениях отслеживаемых сериалов.'
    return 'Новые релизы!', 'Напоминаем о сегодняшних релизах.'


def _send_email_notification(user, subject, introduction_text, sections):
    message = f'Привет, {escape(user.username)}!<br>{introduction_text}<br><br>'
    for section in sections:
        message += f'{section["title"]}:<br>'
        for item in section['items']:
            message += f'{_render_item(item)}<br>'
        message += '<br>'
    message += f'<a href="{FRONTEND_URL}/settings/"><font size="2">Изменить настройки оповещений</font></a>'

    email = EmailMultiAlternatives(subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
    email.content_subtype = 'html'
    email.send()


def _send_telegram_notification(user, subject, introduction_text, sections):
    lines = [f'<b>{subject}</b>', '', f'Привет, {escape(user.username)}!', introduction_text, '']
    for section in sections:
        lines.append(f'<b>{section["title"]}:</b>')
        lines.extend(f'• {_render_item(item)}' for item in section['items'])
        lines.append('')
    lines.append(f'<a href="{FRONTEND_URL}/settings/">Изменить настройки оповещений</a>')

    for chunk in telegram.split_message('\n'.join(lines)):
        telegram.send_message(user.telegram_chat_id, chunk)


def _link(text, url):
    return text, url


def _text(text):
    return text, None


def _render_item(item):
    return ''.join(
        f'<a href="{url}">{escape(text)}</a>' if url else escape(text)
        for text, url in item
    )


def _get_episode_item(episode):
    season = episode.tmdb_season
    show = season.tmdb_show
    show_url = f'{FRONTEND_URL}/show/{show.tmdb_id}/'
    season_url = f'{show_url}season/{season.tmdb_season_number}/'
    return [
        _link(f'{episode.tmdb_episode_number} эпизод', f'{season_url}episode/{episode.tmdb_episode_number}/'),
        _text(' '),
        _link(f'{season.tmdb_season_number} сезона', season_url),
        _text(' сериала '),
        _link(show.tmdb_name, show_url),
    ]


def _get_people_releases_items(user, today_person_credits):
    credits = list(
        today_person_credits.filter(person__tracked_by_users__user=user)
        .select_related('person')
        .order_by('person__name', 'person_id', 'media_type', 'name', 'tmdb_id')
    )

    credits_by_person = {}
    for credit in credits:
        person_credits = credits_by_person.setdefault(
            credit.person_id,
            {'person': credit.person, 'credits': []},
        )
        person_credits['credits'].append(credit)

    items = []
    for value in credits_by_person.values():
        person = value['person']
        item = [_link(person.name, f'{FRONTEND_URL}/person/{person.id}/'), _text(': ')]
        for index, credit in enumerate(value['credits']):
            if index:
                item.append(_text('; '))
            item.extend(_get_person_credit_segments(credit))
        items.append(item)

    return items, len(credits)


def _get_person_credit_segments(credit):
    media_path = 'movie' if credit.media_type == PersonCredit.MEDIA_TYPE_MOVIE else 'show'
    segments = [_link(credit.name, f'{FRONTEND_URL}/{media_path}/{credit.tmdb_id}/')]
    role_labels = [
        PERSON_CREDIT_ROLE_LABELS[role]
        for role in credit.roles
        if role in PERSON_CREDIT_ROLE_LABELS
    ]
    if role_labels:
        segments.append(_text(f' ({", ".join(role_labels)})'))
    return segments


def _get_show_status_change_item(status_change):
    show = status_change.show
    show_link = _link(show.tmdb_name, f'{FRONTEND_URL}/show/{show.tmdb_id}/')
    active_statuses = (
        Show.TMDB_STATUS_RETURNING_SERIES,
        Show.TMDB_STATUS_IN_PRODUCTION,
    )
    terminal_statuses = (
        Show.TMDB_STATUS_ENDED,
        Show.TMDB_STATUS_CANCELED,
    )

    if status_change.new_status == Show.TMDB_STATUS_ENDED:
        return [show_link, _text(' завершился.')]
    if status_change.new_status == Show.TMDB_STATUS_CANCELED:
        return [show_link, _text(' отменён.')]
    if status_change.old_status in terminal_statuses and status_change.new_status in active_statuses:
        return [show_link, _text(' снова продолжается.')]

    old_status = status_change.get_old_status_display()
    new_status = status_change.get_new_status_display()
    return [show_link, _text(f': {old_status} → {new_status}.')]
