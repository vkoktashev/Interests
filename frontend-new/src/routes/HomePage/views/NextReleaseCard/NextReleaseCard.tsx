import React, {useMemo} from "react";
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';
import {
	ROUTE_CALENDAR,
	ROUTE_GAME,
	ROUTE_MOVIE,
	ROUTE_SHOW,
	ROUTE_SHOW_EPISODE,
} from '../../../index';

interface INextReleaseCardProps {
	loggedIn: boolean;
}

function parseDate(dateString: string) {
	const [year, month, day] = dateString.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function formatDateLabel(date: Date) {
	return date.toLocaleDateString("ru-RU", {
		year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
		month: "long",
		day: "numeric",
	});
}

function NextReleaseCard({loggedIn}: INextReleaseCardProps) {
	const bem = useBem('home-page');

	const calendarFetchConfig = useMemo(() => loggedIn && ({
		url: `/users/user/release_calendar/`,
		method: 'get',
	}), [loggedIn]);

	const {data: calendar, isLoading} = useFetch(calendarFetchConfig as any);

	const nextRelease = useMemo(() => {
		if (!calendar) return null;
		const today = new Date();
		const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const entries: any = Object.entries(calendar).sort((a, b) => (
			parseDate(a[0]).getTime() - parseDate(b[0]).getTime()
		));

		for (const [dateString, day] of entries) {
			const date = parseDate(dateString);
			if (date.getTime() < startOfToday.getTime()) continue;

			if (day?.games?.length) {
				const game = day.games[0];
				return {
					date,
					kind: 'game',
					title: game.rawg_name,
					route: ROUTE_GAME,
					params: {gameId: game.rawg_slug},
				};
			}
			if (day?.movies?.length) {
				const movie = day.movies[0];
				return {
					date,
					kind: 'movie',
					title: movie.tmdb_name,
					route: ROUTE_MOVIE,
					params: {movieId: movie.tmdb_id},
				};
			}
			if (day?.episodes?.length) {
				const episode = day.episodes[0];
				return {
					date,
					kind: 'episode',
					episodeLabel: `s${episode.tmdb_season_number}e${episode.tmdb_episode_number}`,
					showName: episode.tmdb_show?.tmdb_name,
					episodeRoute: ROUTE_SHOW_EPISODE,
					showRoute: ROUTE_SHOW,
					episodeParams: {
						showId: episode.tmdb_show?.tmdb_id,
						showSeasonId: episode.tmdb_season_number,
						showEpisodeId: episode.tmdb_episode_number,
					},
					showParams: {
						showId: episode.tmdb_show?.tmdb_id,
					},
				};
			}
		}
		return null;
	}, [calendar]);

	const calendarNote = loggedIn
		? "Подписки и напоминания"
		: "Войдите, чтобы увидеть персональные релизы";

	return (
		<div className={bem.element('card', {accent: true})}>
			<p className={bem.element('card-title')}>Следующий релиз</p>
			<p className={bem.element('card-value')}>
				{isLoading && loggedIn && "Загрузка календаря..."}
				{!isLoading && !nextRelease && loggedIn && "Релизов пока нет"}
				{!loggedIn && "Персональный календарь"}
				{nextRelease?.kind === 'game' && (
					<Link
						className={bem.element('link')}
						toRoute={nextRelease.route}
						toRouteParams={nextRelease.params}>
						{nextRelease.title}
					</Link>
				)}
				{nextRelease?.kind === 'movie' && (
					<Link
						className={bem.element('link')}
						toRoute={nextRelease.route}
						toRouteParams={nextRelease.params}>
						{nextRelease.title}
					</Link>
				)}
				{nextRelease?.kind === 'episode' && (
					<span>
						<Link
							className={bem.element('link')}
							toRoute={nextRelease.episodeRoute}
							toRouteParams={nextRelease.episodeParams}>
							[{nextRelease.episodeLabel}]
						</Link>
						<span>&thinsp;серия&thinsp;</span>
						<Link
							className={bem.element('link')}
							toRoute={nextRelease.showRoute}
							toRouteParams={nextRelease.showParams}>
							{nextRelease.showName}
						</Link>
					</span>
				)}
			</p>
			<p className={bem.element('card-note')}>
				{nextRelease
					? formatDateLabel(nextRelease.date)
					: (
						<Link className={bem.element('link')} toRoute={ROUTE_CALENDAR}>
							Открыть календарь
						</Link>
					)}
				<span>&thinsp;•&thinsp;{calendarNote}</span>
			</p>
		</div>
	);
}

export default NextReleaseCard;
