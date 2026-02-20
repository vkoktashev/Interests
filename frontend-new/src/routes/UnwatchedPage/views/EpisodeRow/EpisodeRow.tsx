import React from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';
import {CheckboxField} from '@steroidsjs/core/ui/form';
import Rating from '../../../../shared/Rating';
import {ROUTE_SHOW_EPISODE} from '../../../index';
import {ISetEpisodesPayload, IUnwatchedEpisode} from '../types';
import './episode-row.scss';

interface IEpisodeRowProps {
	episode: IUnwatchedEpisode;
	showID: number;
	seasonNumber: number;
	setShowEpisodeUserStatus: (showId: string, payload: ISetEpisodesPayload) => Promise<void>;
	loggedIn: boolean;
}

function formatDate(date?: string): string {
	if (!date) {
		return 'Дата неизвестна';
	}
	const parsedDate = new Date(date);
	if (Number.isNaN(parsedDate.getTime())) {
		return 'Дата неизвестна';
	}
	return parsedDate.toLocaleDateString('ru-RU');
}

function EpisodeRow({
	episode,
	showID,
	seasonNumber,
	setShowEpisodeUserStatus,
	loggedIn,
}: IEpisodeRowProps) {
	const bem = useBem('episode-row');

	return (
		<div className={bem.block()}>
			<div className={bem.element('left')}>
				<CheckboxField
					fieldLayoutClassName={bem.element('checkbox')}
					attribute={[showID, episode.tmdb_id].join('_')}
				/>
				<div className={bem.element('meta')}>
					<span className={bem.element('code')}>
						S{seasonNumber}E{episode.tmdb_episode_number}
					</span>
					<span className={bem.element('date')}>{formatDate(episode.tmdb_release_date)}</span>
				</div>
			</div>

			<div className={bem.element('center')}>
				<Link
					className={bem.element('name')}
					toRoute={ROUTE_SHOW_EPISODE}
					toRouteParams={{
						showId: showID,
						showSeasonId: seasonNumber,
						showEpisodeId: episode.tmdb_episode_number,
					}}
					title={episode.tmdb_name}
				>
					{episode.tmdb_name || `Серия ${episode.tmdb_episode_number}`}
				</Link>
			</div>

			{loggedIn && (
				<div className={bem.element('rate')}>
					<Rating
						withEye
						readonly={!loggedIn}
						initialRating={-1}
						onChange={score => {
							setShowEpisodeUserStatus(String(showID), {
								episodes: [{
									tmdb_id: episode.tmdb_id,
									score,
								}],
							});
						}}
					/>
				</div>
			)}
		</div>
	);
}

export default EpisodeRow;
