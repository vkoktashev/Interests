import React from 'react';
import {MdApps, MdLocalMovies, MdLiveTv, MdVideogameAsset} from 'react-icons/md';
import {useBem} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW, ROUTE_SHOW_EPISODE} from '../../../index';
import {ICalendarDay, TCalendarEntry} from '../../calendarTypes';
import './releases-list.scss';

interface IReleasesListProps {
	entries: TCalendarEntry[];
}

type TReleaseType = 'game' | 'movie' | 'episode';

interface IReleaseCoverProps {
	src?: string;
	alt: string;
	type: TReleaseType;
}

function getReleaseIcon(type: TReleaseType) {
	if (type === 'game') {
		return <MdVideogameAsset />;
	}
	if (type === 'movie') {
		return <MdLocalMovies />;
	}
	return <MdLiveTv />;
}

function ReleaseCover({src, alt, type}: IReleaseCoverProps) {
	const bem = useBem('releases-list');

	if (src) {
		return (
			<img
				className={bem.element('cover')}
				src={src}
				alt={alt}
				loading='lazy'
			/>
		);
	}

	return (
		<div className={bem.element('cover-placeholder', {[type]: true})} aria-hidden='true'>
			{getReleaseIcon(type)}
		</div>
	);
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
	const bem = useBem('releases-list');

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
								<div key={`game-${game.id}`} className={bem.element('release-card')}>
									<ReleaseCover src={game.poster_path} alt={game.name} type='game'/>
									<div className={bem.element('release-body')}>
										<div className={bem.element('release-title')}>
											<Link toRoute={ROUTE_GAME} toRouteParams={{gameId: game.slug}}>
												{game.name}
											</Link>
										</div>
									</div>
								</div>
							))}

							{day.movies.map(movie => (
								<div
									key={`movie-${movie.tmdb_id}-${movie.calendar_release_type || 'theatrical'}`}
									className={bem.element('release-card')}
								>
									<ReleaseCover src={movie.tmdb_poster_path} alt={movie.tmdb_name} type='movie'/>
									<div className={bem.element('release-body')}>
										<div className={bem.element('release-title')}>
											<Link toRoute={ROUTE_MOVIE} toRouteParams={{movieId: movie.tmdb_id}}>
												{movie.tmdb_name}
											</Link>
										</div>
										{movie.calendar_release_type === 'digital' ? (
											<div className={bem.element('release-meta')}>Цифровой релиз</div>
										) : null}
									</div>
								</div>
							))}

							{day.episodes.map(episode => (
								<div key={`episode-${episode.tmdb_id}`} className={bem.element('release-card')}>
									<ReleaseCover
										src={episode.tmdb_show.tmdb_poster_path}
										alt={episode.tmdb_show.tmdb_name}
										type='episode'
									/>
									<div className={bem.element('release-body')}>
										<div className={bem.element('release-title')}>
											<Link
												toRoute={ROUTE_SHOW_EPISODE}
												toRouteParams={{
													showId: episode.tmdb_show.tmdb_id,
													showSeasonId: episode.tmdb_season_number,
													showEpisodeId: episode.tmdb_episode_number,
												}}
											>
												S{episode.tmdb_season_number}E{episode.tmdb_episode_number}
												{episode.tmdb_name ? ` · ${episode.tmdb_name}` : ''}
											</Link>
										</div>
										<div className={bem.element('release-meta')}>
											<Link toRoute={ROUTE_SHOW} toRouteParams={{showId: episode.tmdb_show.tmdb_id}}>
												{episode.tmdb_show.tmdb_name}
											</Link>
										</div>
									</div>
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
