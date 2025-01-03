import React from 'react';
import classnames from 'classnames';
import EpisodeRow from '../EpisodeRow';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_SHOW} from '../../../index';
import './show-block.scss';

function ShowBlock({ loggedIn, show, setShowEpisodeUserStatus, className }) {
	function getUserSeasonOpen(showID, seasonNumber) {
		let localData = localStorage.getItem(`${showID}_${seasonNumber}`);
		return localData ? localData === "true" : true;
	}

	function setUserSeasonOpen(showID, seasonNumber, isOpen) {
		localStorage.setItem(`${showID}_${seasonNumber}`, isOpen);
	}

	return (
		<div className={classnames("show-block", className)}>
			<Link
				toRoute={ROUTE_SHOW}
				toRouteParams={{
					showId: show.tmdb_id,
				}}>
				<h4 className='show-block__name'>{show?.tmdb_name}</h4>
			</Link>

			{show?.seasons.map((season, counter) => {
				return (
					<details
						open={getUserSeasonOpen(show.tmdb_id, season.tmdb_season_number)}
						className='show-block__season'
						key={counter}
						onToggle={(e: any) => setUserSeasonOpen(show.tmdb_id, season.tmdb_season_number, e.target.open)}>
						<summary>{season.tmdb_name}</summary>
						<ul className='show-block__season-ul'>
							{season.episodes.map((episode) => (
								<li className='show-block__episode' key={episode.tmdb_id}>
									<EpisodeRow episode={episode} showID={show.tmdb_id} seasonNumber={season.tmdb_season_number} setShowEpisodeUserStatus={setShowEpisodeUserStatus} loggedIn={loggedIn} />
								</li>
							))}
						</ul>
					</details>
				);
			})}
		</div>
	);
}

export default ShowBlock;
