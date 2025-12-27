import React from "react";
import {Link} from '@steroidsjs/core/ui/nav';
import Rating from '../../../../shared/Rating';
import "./episode-row.scss";
import {ROUTE_SHOW_EPISODE} from '../../../index';
import {CheckboxField} from '@steroidsjs/core/ui/form';
import {useBem} from '@steroidsjs/core/hooks';

function DetailedEpisodeRow({ episode, showID, seasonNumber, setShowEpisodeUserStatus, loggedIn }) {
	const bem = useBem('DetailedEpisodeRow');

	function parseDate(date) {
		let newDate = new Date(date);
		return newDate.toLocaleDateString("ru-RU");
	}

	return (
		<div className={bem.block()}>
			<CheckboxField
				fieldLayoutClassName={bem.element('checkbox')}
				attribute={[showID, episode.tmdb_id].join('_')}
			/>
			<p className={bem.element('date')}>
				{parseDate(episode.tmdb_release_date)}
			</p>
			<div hidden={!loggedIn} className={bem.element('rate')}>
				<Rating
					withEye={true}
					readonly={!loggedIn}
					initialRating={-1}
					onChange={(score) => {
						setShowEpisodeUserStatus(
							showID,
							{
								episodes: [
									{
										tmdb_id: episode.tmdb_id,
										score: score,
									},
								],
							},
						);
					}}
				/>
			</div>
			<Link
				className={bem.element('name')}
				toRoute={ROUTE_SHOW_EPISODE}
				toRouteParams={{
					showId: showID,
					showSeasonId: seasonNumber,
					showEpisodeId: episode.tmdb_episode_number,
				}}
				title={episode.tmdb_name}>
				Серия {episode.tmdb_episode_number} - {episode.tmdb_name}
			</Link>
		</div>
	);
}

export default DetailedEpisodeRow;
