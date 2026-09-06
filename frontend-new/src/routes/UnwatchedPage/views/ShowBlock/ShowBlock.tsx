import React, {useCallback, useEffect, useMemo, useState} from 'react';
import classnames from 'classnames';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';
import {FaChevronDown, FaRegClock} from 'react-icons/fa';
import EpisodeRow from '../EpisodeRow';
import {ROUTE_SHOW} from '../../../index';
import {ISetEpisodesPayload, IUnwatchedShow} from '../types';
import pluralizeRu from '../pluralizeRu';
import formatDuration from '../../../../shared/formatDuration';
import './show-block.scss';

interface IShowState {
	label: string;
	tone: 'active' | 'ended' | 'planned' | 'canceled';
}

interface IRuntimeInfo {
	minutes: number;
}

const SHOW_STATES: Record<string, IShowState> = {
	'Ended': {label: 'Завершился', tone: 'ended'},
	'Завершился': {label: 'Завершился', tone: 'ended'},
	'Returning Series': {label: 'Продолжается', tone: 'active'},
	'Продолжается': {label: 'Продолжается', tone: 'active'},
	'In Production': {label: 'В производстве', tone: 'active'},
	'В производстве': {label: 'В производстве', tone: 'active'},
	'Planned': {label: 'Планируется', tone: 'planned'},
	'Планируется': {label: 'Планируется', tone: 'planned'},
	'Pilot': {label: 'Пилот', tone: 'planned'},
	'Пилот': {label: 'Пилот', tone: 'planned'},
	'Canceled': {label: 'Отменён', tone: 'canceled'},
	'Отменен': {label: 'Отменён', tone: 'canceled'},
	'Отменён': {label: 'Отменён', tone: 'canceled'},
};

function getSeasonStorageKey(showId: number, seasonNumber: number): string {
	return `unwatched:${showId}:${seasonNumber}`;
}

function getUserSeasonOpen(showId: number, seasonNumber: number): boolean {
	if (typeof window === 'undefined') {
		return true;
	}
	const localData = localStorage.getItem(getSeasonStorageKey(showId, seasonNumber));
	return localData ? localData === 'true' : true;
}

function setUserSeasonOpen(showId: number, seasonNumber: number, isOpen: boolean): void {
	if (typeof window === 'undefined') {
		return;
	}
	localStorage.setItem(getSeasonStorageKey(showId, seasonNumber), String(isOpen));
}

function getPosterSrc(path?: string): string | null {
	if (!path) {
		return null;
	}
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}
	return `https://image.tmdb.org/t/p/w185${path}`;
}

function getRuntimeInfo(episodes, fallbackRuntime: number): IRuntimeInfo | null {
	if (episodes.length === 0) {
		return null;
	}

	const hasMissingRuntime = episodes.some(episode => Number(episode.tmdb_runtime || 0) === 0);
	if (hasMissingRuntime && fallbackRuntime === 0) {
		return null;
	}

	return {
		minutes: episodes.reduce(
			(sum, episode) => sum + (Number(episode.tmdb_runtime || 0) || fallbackRuntime),
			0,
		),
	};
}

interface IShowBlockProps {
	loggedIn: boolean;
	show: IUnwatchedShow;
	setShowEpisodeUserStatus: (showId: string, payload: ISetEpisodesPayload) => Promise<void>;
	className?: string;
}

function ShowBlock({
	loggedIn,
	show,
	setShowEpisodeUserStatus,
	className,
}: IShowBlockProps) {
	const bem = useBem('show-block');
	const [posterLoadError, setPosterLoadError] = useState(false);
	const [openSeasons, setOpenSeasons] = useState<Record<number, boolean>>(() =>
		(show?.seasons || []).reduce((acc, season) => {
			acc[season.tmdb_season_number] = getUserSeasonOpen(show.tmdb_id, season.tmdb_season_number);
			return acc;
		}, {} as Record<number, boolean>)
	);
	const posterSrc = useMemo(() => getPosterSrc(show.tmdb_poster_path), [show.tmdb_poster_path]);
	const showState = SHOW_STATES[show.tmdb_status || ''];

	const totalEpisodes = useMemo(
		() => show?.seasons?.reduce((sum, season) => sum + (season.episodes?.length || 0), 0) || 0,
		[show],
	);
	const runtime = useMemo(() => {
		const episodes = (show?.seasons || []).flatMap(season => season.episodes || []);
		const knownRuntimes = episodes
			.map(episode => Number(episode.tmdb_runtime || 0))
			.filter(episodeRuntime => episodeRuntime > 0);
		const fallbackRuntime = Number(show.tmdb_episode_runtime || 0) || (
			knownRuntimes.length > 0
				? Math.round(knownRuntimes.reduce((sum, episodeRuntime) => sum + episodeRuntime, 0) / knownRuntimes.length)
				: 0
		);

		return {
			show: getRuntimeInfo(episodes, fallbackRuntime),
			seasons: new Map(
				(show?.seasons || []).map(season => [
					season.tmdb_season_number,
					getRuntimeInfo(season.episodes || [], fallbackRuntime),
				])
			),
		};
	}, [show]);
	const totalAvailableEpisodes = Number(show.total_episodes_count || 0);
	const watchedEpisodes = Math.min(Number(show.watched_episodes_count || 0), totalAvailableEpisodes);
	const progressPercent = totalAvailableEpisodes > 0
		? Math.round(watchedEpisodes * 100 / totalAvailableEpisodes)
		: 0;

	useEffect(() => {
		setOpenSeasons(
			(show?.seasons || []).reduce((acc, season) => {
				acc[season.tmdb_season_number] = getUserSeasonOpen(show.tmdb_id, season.tmdb_season_number);
				return acc;
			}, {} as Record<number, boolean>)
		);
	}, [show.tmdb_id, show.seasons]);

	const handleSeasonToggle = useCallback((seasonNumber: number, isOpen: boolean) => {
		setOpenSeasons(prev => ({
			...prev,
			[seasonNumber]: isOpen,
		}));
		setUserSeasonOpen(show.tmdb_id, seasonNumber, isOpen);
	}, [show.tmdb_id]);

	return (
		<article className={classnames(bem.block(), className)}>
			<div
				className={bem.element('head')}
				style={{'--watch-progress': `${progressPercent}%`} as React.CSSProperties}
				title={`Просмотрено ${watchedEpisodes} из ${totalAvailableEpisodes} серий`}
			>
				<div className={bem.element('poster')}>
					{!posterLoadError && posterSrc ? (
						<img
							src={posterSrc}
							alt={show.tmdb_name}
							loading='lazy'
							onError={() => setPosterLoadError(true)}
						/>
					) : (
						<div className={bem.element('poster-fallback')}>
							{(show.tmdb_name || '?').charAt(0).toUpperCase()}
						</div>
					)}
				</div>

				<Link
					toRoute={ROUTE_SHOW}
					toRouteParams={{showId: show.tmdb_id}}
					className={bem.element('name-link')}
				>
					<h3 className={bem.element('name')}>{show.tmdb_name}</h3>
				</Link>
				<div className={bem.element('meta')}>
					{showState && (
						<span className={bem.element('status', {[showState.tone]: true})}>
							{showState.label}
						</span>
					)}
					<span>
						{show.seasons?.length || 0} {pluralizeRu(show.seasons?.length || 0, 'сезон', 'сезона', 'сезонов')}
					</span>
					<span>
						{totalEpisodes} {pluralizeRu(totalEpisodes, 'серия', 'серии', 'серий')}
					</span>
					{runtime.show && (
						<span className={bem.element('runtime')}>
							<FaRegClock />
							{formatDuration(runtime.show.minutes)}
						</span>
					)}
				</div>
			</div>

			<div className={bem.element('seasons')}>
				{show?.seasons?.map(season => {
					const isSeasonOpen = openSeasons[season.tmdb_season_number] ?? true;
					const seasonRuntime = runtime.seasons.get(season.tmdb_season_number);
					return (
						<details
							open={isSeasonOpen}
							className={bem.element('season')}
							key={season.tmdb_id || season.tmdb_season_number}
							onToggle={(event: React.SyntheticEvent<HTMLDetailsElement>) =>
								handleSeasonToggle(season.tmdb_season_number, event.currentTarget.open)
							}
						>
							<summary className={bem.element('season-summary')}>
								<div className={bem.element('season-summary-left')}>
									<span className={bem.element('season-name')}>{season.tmdb_name}</span>
									<span className={bem.element('season-count')}>
										{season.episodes?.length || 0} {pluralizeRu(season.episodes?.length || 0, 'серия', 'серии', 'серий')}
									</span>
									{seasonRuntime && (
										<span
											className={bem.element('season-runtime')}
											title={`Осталось ${formatDuration(seasonRuntime.minutes)}`}
										>
											<FaRegClock />
											{formatDuration(seasonRuntime.minutes)}
										</span>
									)}
								</div>
								<div className={bem.element('season-toggle')}>
									<span className={bem.element('season-toggle-text')}>
										{isSeasonOpen ? 'Свернуть сезон' : 'Развернуть сезон'}
									</span>
									<FaChevronDown className={bem.element('season-toggle-icon')} />
								</div>
							</summary>

							<ul className={bem.element('season-list')}>
								{season.episodes?.map(episode => (
									<li className={bem.element('episode')} key={episode.tmdb_id}>
										<EpisodeRow
											episode={episode}
											showID={show.tmdb_id}
											seasonNumber={season.tmdb_season_number}
											setShowEpisodeUserStatus={setShowEpisodeUserStatus}
											loggedIn={loggedIn}
										/>
									</li>
								))}
							</ul>
						</details>
					);
				})}
			</div>
		</article>
	);
}

export default ShowBlock;
