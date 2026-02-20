import React, {useCallback, useEffect, useMemo, useState} from 'react';
import classnames from 'classnames';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';
import {FaChevronDown} from 'react-icons/fa';
import EpisodeRow from '../EpisodeRow';
import {ROUTE_SHOW} from '../../../index';
import {ISetEpisodesPayload, IUnwatchedShow} from '../types';
import './show-block.scss';

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

	const totalEpisodes = useMemo(
		() => show?.seasons?.reduce((sum, season) => sum + (season.episodes?.length || 0), 0) || 0,
		[show],
	);

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
			<div className={bem.element('head')}>
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
					<span>{show.seasons?.length || 0} сезонов</span>
					<span>{totalEpisodes} серий</span>
				</div>
			</div>

			<div className={bem.element('seasons')}>
				{show?.seasons?.map(season => {
					const isSeasonOpen = openSeasons[season.tmdb_season_number] ?? true;
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
									<span className={bem.element('season-count')}>{season.episodes?.length || 0} серий</span>
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
