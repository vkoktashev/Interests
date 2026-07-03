from datetime import datetime
import logging

from celery.schedules import crontab
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q

from config.celery import app
from config.settings import EMAIL_HOST_USER
from games.models import Game, UserGame
from movies.models import Movie, UserMovie
from shows.models import Episode, Show, UserShow
from users.models import User
from utils.constants import SITE_URL, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE

logger = logging.getLogger(__name__)


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR + 1, minute=UPDATE_DATES_MINUTE),
        send_release_emails.s(),
    )


@app.task
def send_release_emails():
    today_date = datetime.today().date()

    today_games = Game.objects.filter(
        igdb_release_date=today_date,
        igdb_release_date_format=Game.IGDB_RELEASE_DATE_FORMAT_EXACT,
    )
    today_movies = Movie.objects.filter(tmdb_release_date=today_date)
    today_digital_movies = Movie.objects.filter(tmdb_digital_release_date=today_date)
    today_episodes = Episode.objects.filter(tmdb_release_date=today_date)
    users = User.objects.filter(Q(receive_episodes_releases=True) |
                                Q(receive_games_releases=True) |
                                Q(receive_movies_releases=True) |
                                Q(receive_movies_digital_releases=True))
    candidates_count = users.count()
    sent_count = 0
    skipped_count = 0
    failed_count = 0

    logger.info(
        'send_release_emails: start today=%s users=%s games=%s movies=%s digital_movies=%s episodes=%s',
        today_date,
        candidates_count,
        today_games.count(),
        today_movies.count(),
        today_digital_movies.count(),
        today_episodes.count(),
    )

    for user in users:
        games_message = ''
        movies_message = ''
        digital_movies_message = ''
        episodes_message = ''
        message_empty = True
        user_games_count = 0
        user_movies_count = 0
        user_digital_movies_count = 0
        user_episodes_count = 0

        logger.debug('send_release_emails: processing user id=%s username=%s', user.id, user.username)

        if user.receive_games_releases:
            games = today_games.filter(usergame__user=user) \
                .exclude(usergame__status=UserGame.STATUS_NOT_PLAYED) \
                .exclude(usergame__status=UserGame.STATUS_STOPPED)
            user_games_count = games.count()

            if user_games_count:
                games_message += f'Новые игры:<br>'
                for game in games:
                    games_message += f'<a href="http://{SITE_URL}/game/{game.igdb_slug}/">' \
                                     f'{game.igdb_name}</a><br>'
                games_message += '<br>'
                message_empty = False

        if user.receive_movies_releases:
            movies = today_movies.filter(usermovie__user=user) \
                .exclude(usermovie__status=UserMovie.STATUS_NOT_WATCHED) \
                .exclude(usermovie__status=UserMovie.STATUS_STOPPED)
            user_movies_count = movies.count()

            if user_movies_count:
                movies_message += f'Новые фильмы:<br>'
                for movie in movies:
                    movies_message += f'<a href="http://{SITE_URL}/movie/{movie.tmdb_id}/">' \
                                      f'{movie.tmdb_name}</a><br>'
                movies_message += '<br>'
                message_empty = False

        if user.receive_movies_digital_releases:
            digital_movies = today_digital_movies.filter(usermovie__user=user) \
                .exclude(usermovie__status=UserMovie.STATUS_NOT_WATCHED) \
                .exclude(usermovie__status=UserMovie.STATUS_STOPPED)

            if user.receive_movies_releases:
                digital_movies = digital_movies.exclude(tmdb_release_date=today_date)
            user_digital_movies_count = digital_movies.count()

            if user_digital_movies_count:
                digital_movies_message += 'Цифровые релизы фильмов:<br>'
                for movie in digital_movies:
                    digital_movies_message += f'<a href="http://{SITE_URL}/movie/{movie.tmdb_id}/">' \
                                              f'{movie.tmdb_name}</a><br>'
                digital_movies_message += '<br>'
                message_empty = False

        if user.receive_episodes_releases:
            shows = Show.objects.filter(usershow__user=user) \
                .exclude(usershow__status=UserShow.STATUS_NOT_WATCHED) \
                .exclude(usershow__status=UserShow.STATUS_STOPPED)

            episodes = today_episodes.select_related('tmdb_season', 'tmdb_season__tmdb_show') \
                .filter(tmdb_season__tmdb_show__in=shows)
            user_episodes_count = episodes.count()

            if user_episodes_count:
                episodes_message += f'Новые эпизоды:<br>'
                for episode in episodes:
                    episodes_message += \
                        f'<a href="http://{SITE_URL}/show/{episode.tmdb_season.tmdb_show.tmdb_id}' \
                        f'/season/{episode.tmdb_season.tmdb_season_number}' \
                        f'/episode/{episode.tmdb_episode_number}/">' \
                        f'{episode.tmdb_episode_number} эпизод</a> ' \
                        f'<a href="http://{SITE_URL}/show/{episode.tmdb_season.tmdb_show.tmdb_id}' \
                        f'/season/{episode.tmdb_season.tmdb_season_number}/">' \
                        f'{episode.tmdb_season.tmdb_season_number} сезона</a> ' \
                        f'сериала ' \
                        f'<a href="http://{SITE_URL}/show/{episode.tmdb_season.tmdb_show.tmdb_id}/">' \
                        f'{episode.tmdb_season.tmdb_show.tmdb_name}</a><br>'
                episodes_message += '<br>'
                message_empty = False

        if not message_empty:
            introduction_message = f'Привет, {user.username}!' \
                                   f'<br>' \
                                   f'Напоминаем о сегодняшних релизах.' \
                                   f'<br><br>'

            preferences_message = f'<a href="http://{SITE_URL}/settings/"><font size="2">' \
                                  f'Изменить настройки оповещений</font></a>'

            mail_subject = 'Новые релизы!'

            message = introduction_message + games_message + movies_message + digital_movies_message + \
                episodes_message + preferences_message
            email = EmailMultiAlternatives(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
            email.content_subtype = 'html'
            try:
                email.send()
            except Exception:
                failed_count += 1
                logger.exception(
                    'send_release_emails: failed to send email user id=%s username=%s games=%s movies=%s digital_movies=%s episodes=%s',
                    user.id,
                    user.username,
                    user_games_count,
                    user_movies_count,
                    user_digital_movies_count,
                    user_episodes_count,
                )
            else:
                sent_count += 1
                logger.debug(
                    'send_release_emails: sent user id=%s username=%s games=%s movies=%s digital_movies=%s episodes=%s',
                    user.id,
                    user.username,
                    user_games_count,
                    user_movies_count,
                    user_digital_movies_count,
                    user_episodes_count,
                )
        else:
            skipped_count += 1
            logger.debug('send_release_emails: skipped user id=%s username=%s reason=no_releases', user.id, user.username)

    logger.info(
        'send_release_emails: finish users=%s sent=%s skipped=%s failed=%s',
        candidates_count,
        sent_count,
        skipped_count,
        failed_count,
    )
