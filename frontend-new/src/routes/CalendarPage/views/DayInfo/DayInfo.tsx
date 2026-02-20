import React, {useMemo} from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW, ROUTE_SHOW_EPISODE} from '../../../index';
import {ICalendarDay} from '../../calendarTypes';
import './day-info.scss';

interface IDayInfoProps {
	day: ICalendarDay;
	date: Date;
	compact?: boolean;
}

interface ICategoryItem {
	id: string | number;
	render: React.ReactNode;
}

interface ICategory {
	key: string;
	title: string;
	items: ICategoryItem[];
}

function DayInfo({day, date, compact}: IDayInfoProps) {
	const categories = useMemo<ICategory[]>(() => {
		return [
			{
				key: 'games',
				title: 'Игры',
				items: day.games.map(game => ({
					id: game.rawg_id,
					render: (
						<Link
							className='day-info__link'
							toRoute={ROUTE_GAME}
							toRouteParams={{gameId: game.rawg_slug}}
						>
							{game.rawg_name}
						</Link>
					),
				})),
			},
			{
				key: 'movies',
				title: 'Фильмы',
				items: day.movies.map(movie => ({
					id: movie.tmdb_id,
					render: (
						<Link
							className='day-info__link'
							toRoute={ROUTE_MOVIE}
							toRouteParams={{movieId: movie.tmdb_id}}
						>
							{movie.tmdb_name}
						</Link>
					),
				})),
			},
			{
				key: 'episodes',
				title: 'Серии',
				items: day.episodes.map(episode => ({
					id: episode.tmdb_id,
					render: (
						<span>
							<Link
								className='day-info__link'
								toRoute={ROUTE_SHOW_EPISODE}
								toRouteParams={{
									showId: episode.tmdb_show.tmdb_id,
									showSeasonId: episode.tmdb_season_number,
									showEpisodeId: episode.tmdb_episode_number,
								}}
							>
								S{episode.tmdb_season_number}E{episode.tmdb_episode_number}
							</Link>
							{' '}сериала{' '}
							<Link
								className='day-info__link'
								toRoute={ROUTE_SHOW}
								toRouteParams={{showId: episode.tmdb_show.tmdb_id}}
							>
								{episode.tmdb_show.tmdb_name}
							</Link>
						</span>
					),
				})),
			},
		];
	}, [day]);

	const hasItems = categories.some(category => category.items.length > 0);

	return (
		<div className={`day-info ${compact ? 'day-info_compact' : ''}`}>
			<h2 className='day-info__date'>
				{date.toLocaleDateString('ru-RU', {
					year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
					month: 'long',
					day: 'numeric',
					weekday: 'long',
				})}
			</h2>

			{hasItems ? categories.map(category => (
				category.items.length > 0 && (
					<section className='day-info__category' key={category.key}>
						<h3 className='day-info__category-header'>{category.title}</h3>
						<div className='day-info__items'>
							{category.items.map(item => (
								<div key={item.id} className='day-info__item'>
									{item.render}
								</div>
							))}
						</div>
					</section>
				)
			)) : (
				<div className='day-info__empty'>
					На выбранную дату релизов нет
				</div>
			)}
		</div>
	);
}

export default DayInfo;
