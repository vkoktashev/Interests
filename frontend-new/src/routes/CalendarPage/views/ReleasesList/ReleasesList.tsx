import React from 'react';
import {MdApps, MdLocalMovies, MdLiveTv, MdVideogameAsset} from 'react-icons/md';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW, ROUTE_SHOW_EPISODE} from '../../../index';
import {ICalendarDay, TCalendarEntry} from '../../calendarTypes';
import './releases-list.scss';

interface IReleasesListProps {
	entries: TCalendarEntry[];
}

function getDayType(day: ICalendarDay): 'game' | 'movie' | 'episode' | 'mixed' {
	const hasGames = day.games.length > 0;
	const hasMovies = day.movies.length > 0;
	const hasEpisodes = day.episodes.length > 0;

	if (hasGames && !hasMovies && !hasEpisodes) {
		return 'game';
	}
	if (hasMovies && !hasGames && !hasEpisodes) {
		return 'movie';
	}
	if (hasEpisodes && !hasGames && !hasMovies) {
		return 'episode';
	}
	return 'mixed';
}

function getDayIcon(dayType: ReturnType<typeof getDayType>) {
	if (dayType === 'game') {
		return <MdVideogameAsset />;
	}
	if (dayType === 'movie') {
		return <MdLocalMovies />;
	}
	if (dayType === 'episode') {
		return <MdLiveTv />;
	}
	return <MdApps />;
}

function getDaysLeftLabel(dateKey: string): string {
	const today = new Date();
	const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
	const target = new Date(`${dateKey}T00:00:00`).getTime();
	const diff = Math.round((target - currentDay) / (24 * 60 * 60 * 1000));

	if (diff <= 0) {
		return 'сегодня';
	}

	const value = diff % 100;
	if (value >= 11 && value <= 14) {
		return `${diff} дней`;
	}
	const last = diff % 10;
	if (last === 1) {
		return `${diff} день`;
	}
	if (last >= 2 && last <= 4) {
		return `${diff} дня`;
	}
	return `${diff} дней`;
}

function ReleasesList({entries}: IReleasesListProps) {
	if (entries.length === 0) {
		return (
			<div className='releases-list releases-list_empty'>
				Пока нет ближайших релизов
			</div>
		);
	}

	return (
		<div className='releases-list'>
			{entries.map(([dateKey, day]) => {
				const date = new Date(`${dateKey}T00:00:00`);
				const dayType = getDayType(day);

				return (
					<article key={dateKey} className={`releases-list__event releases-list__event_${dayType}`}>
						<div className={`releases-list__marker releases-list__marker_${dayType}`}>
							{getDayIcon(dayType)}
						</div>
						<div className='releases-list__event-head'>
							<div>
								<div className='releases-list__date'>
									{date.toLocaleDateString('ru-RU', {
										year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
										month: 'long',
										day: 'numeric',
										weekday: 'long',
									})}
								</div>
								<div className='releases-list__left'>
									Через {getDaysLeftLabel(dateKey)}
								</div>
							</div>
						</div>

						<div className='releases-list__content'>
							{day.games.map(game => (
								<div key={`game-${game.rawg_id}`} className='releases-list__item'>
									<span className='releases-list__badge releases-list__badge_game'>Игра</span>
									<Link toRoute={ROUTE_GAME} toRouteParams={{gameId: game.rawg_slug}}>
										{game.rawg_name}
									</Link>
								</div>
							))}

							{day.movies.map(movie => (
								<div key={`movie-${movie.tmdb_id}`} className='releases-list__item'>
									<span className='releases-list__badge releases-list__badge_movie'>Фильм</span>
									<Link toRoute={ROUTE_MOVIE} toRouteParams={{movieId: movie.tmdb_id}}>
										{movie.tmdb_name}
									</Link>
								</div>
							))}

							{day.episodes.map(episode => (
								<div key={`episode-${episode.tmdb_id}`} className='releases-list__item'>
									<span className='releases-list__badge releases-list__badge_episode'>Серия</span>
									<Link
										toRoute={ROUTE_SHOW_EPISODE}
										toRouteParams={{
											showId: episode.tmdb_show.tmdb_id,
											showSeasonId: episode.tmdb_season_number,
											showEpisodeId: episode.tmdb_episode_number,
										}}
									>
										S{episode.tmdb_season_number}E{episode.tmdb_episode_number}
									</Link>
									<span>
										{' '}сериала{' '}
										<Link toRoute={ROUTE_SHOW} toRouteParams={{showId: episode.tmdb_show.tmdb_id}}>
											{episode.tmdb_show.tmdb_name}
										</Link>
									</span>
								</div>
							))}
						</div>
					</article>
				);
			})}
		</div>
	);
}

export default ReleasesList;
