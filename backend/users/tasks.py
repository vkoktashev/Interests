from datetime import datetime

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


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR + 1, minute=UPDATE_DATES_MINUTE),
        send_release_emails.s(),
    )


@app.task
def send_release_emails():
    today_date = datetime.today().date()

    today_games = Game.objects.filter(rawg_release_date=today_date)
    today_movies = Movie.objects.filter(tmdb_release_date=today_date)
    today_episodes = Episode.objects.filter(tmdb_release_date=today_date)

    for user in User.objects.filter(Q(receive_episodes_release_email=True) |
                                    Q(receive_game_release_email=True) |
                                    Q(receive_movie_release_email=True)):
        games_message = ''
        movies_message = ''
        episodes_message = ''

        if user.receive_game_release_email:
            games = today_games.filter(usergame__user=user) \
                .exclude(usergame__status=UserGame.STATUS_NOT_PLAYED) \
                .exclude(usergame__status=UserGame.STATUS_STOPPED)

            if games.exists():
                games_message += f'Новые игры:<br>'
                for game in games:
                    games_message += f'<a href="http://{SITE_URL}/game/{game.rawg_slug}/">' \
                                     f'{game.rawg_name}</a><br>'
                games_message += '<br>'

        if user.receive_movie_release_email:
            movies = today_movies.filter(usermovie__user=user) \
                .exclude(usermovie__status=UserMovie.STATUS_NOT_WATCHED) \
                .exclude(usermovie__status=UserMovie.STATUS_STOPPED)

            if movies.exists():
                movies_message += f'Новые фильмы:<br>'
                for movie in movies:
                    movies_message += f'<a href="http://{SITE_URL}/movie/{movie.tmdb_id}/">' \
                                      f'{movie.tmdb_name}</a><br>'
                movies_message += '<br>'

        if user.receive_episodes_release_email:
            shows = Show.objects.filter(usershow__user=user) \
                .exclude(usershow__status=UserShow.STATUS_NOT_WATCHED) \
                .exclude(usershow__status=UserShow.STATUS_STOPPED)

            episodes = today_episodes.select_related('tmdb_season', 'tmdb_season__tmdb_show') \
                .filter(tmdb_season__tmdb_show__in=shows)

            if episodes.exists():
                episodes_message += f'Новые эпизоды:<br>'
                for episode in episodes:
                    episodes_message += \
                        f'<a href="http://{SITE_URL}/show/{episode.tmdb_season.tmdb_show.tmdb_id}' \
                        f'/season/{episode.tmdb_season.tmdb_season_number}' \
                        f'/episode/{episode.tmdb_episode_number}/">' \
                        f'{episode.tmdb_episode_number} эпизод</a> ' \
                        f'<a href="http://{SITE_URL}/show/{episode.tmdb_season.tmdb_show.tmdb_id}' \
                        f'/season/{episode.tmdb_season.tmdb_season_number}">' \
                        f'{episode.tmdb_season.tmdb_season_number} сезона</a> ' \
                        f'сериала ' \
                        f'<a href="http://{SITE_URL}/show/{episode.tmdb_season.tmdb_show.tmdb_id}/">' \
                        f'{episode.tmdb_season.tmdb_show.tmdb_name}</a><br>'
                episodes_message += '<br>'

        introduction_message = f'Привет, {user.username}!' \
                               f'<br>' \
                               f'Напоминаем о сегодняшних релизах.' \
                               f'<br><br>'

        preferences_message = f'<a href="https://bit.ly/3jJofky"><font size="2">' \
                              f'Изменить настройки оповещений</font></a>'

        mail_subject = 'Новые релизы!'

        message = introduction_message + games_message + movies_message + episodes_message + preferences_message
        email = EmailMultiAlternatives(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
        email.content_subtype = 'html'
        email.send()
