import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import { computed } from "mobx";
import AuthStore from "store/AuthStore";
import ShowStore from "store/ShowStore";
import PagesStore from "store/PagesStore";

import LoadingOverlay from "react-loading-overlay";
import DetailEpisodeRow from "shared/DetailEpisodeRow";
import Rating from "shared/Rating";
import classnames from "classnames";
import "./season-block.sass";

const SeasonBlock = observer(
	({
		showID,
		seasonNumber,
		//onChangeStatus,
		userWatchedShow,
		className,
	}) => {
		const { loggedIn } = AuthStore;
		const { openLoginForm, setSaveEpisodes } = PagesStore;
		const { requestSeasons, requestSeasonsUserInfo, setEpisodesStatus, setSeasonStatus } = ShowStore;
		const showSeason = computed(() => ShowStore.getShowSeason(seasonNumber)).get();
		const showSeasonState = computed(() => ShowStore.getShowSeasonState(seasonNumber)).get();
		const showUserInfo = computed(() => ShowStore.getShowSeasonUserInfo(seasonNumber)).get();

		let history = useHistory();
		const [isChecked, setIsChecked] = useState(0);
		const [userRate, setUserRate] = useState(0);

		useEffect(
			() => {
				setIsChecked(0);
				setUserRate(0);
				requestSeasons(showID, seasonNumber);
			},
			// eslint-disable-next-line
			[showID, seasonNumber, requestSeasons]
		);

		useEffect(
			() => {
				setIsChecked(0);
				setUserRate(0);
				if (loggedIn) requestSeasonsUserInfo(showID, seasonNumber);
			},
			// eslint-disable-next-line
			[loggedIn, showID, seasonNumber]
		);

		useEffect(
			() => {
				if (showUserInfo?.score) {
					setUserRate(showUserInfo.score);
				} else {
					setUserRate(0);
				}
			},
			// eslint-disable-next-line
			[showUserInfo]
		);

		function getEpisodeByID(episodes, id) {
			for (let episode in episodes) if (episodes[episode].tmdb_id === id) return episodes[episode];
		}

		return (
			<LoadingOverlay active={showSeasonState === "pending"} spinner text='Загрузка...'>
				<div key={showSeason?.id} className={classnames("season-block", className)}>
					<a
						href={window.location.origin + "/show/" + showID + "/season/" + seasonNumber}
						onClick={(e) => {
							history.push("/show/" + showID + "/season/" + seasonNumber);
							e.preventDefault();
						}}
						className='season-block__link'>
						<h5 className='season-block__name'> {showSeason?.name} </h5>
					</a>
					<div hidden={!loggedIn || !userWatchedShow} className='season-block__rate'>
						<Rating
							initialRating={userRate}
							onChange={(score) => {
								if (!loggedIn) {
									openLoginForm();
								} else {
									setUserRate(score);
									setSeasonStatus({ score: score }, showID, seasonNumber);
								}
							}}
						/>
					</div>
					<br />
					<details open={true} className='season-block__episodes'>
						<summary>Развернуть</summary>
						<div hidden={!loggedIn || !userWatchedShow} className='season-block__check-all'>
							Выбрать все&nbsp;
							<input
								type='checkbox'
								checked={isChecked > 0}
								onChange={(res) => {
									setSaveEpisodes(true);
									setIsChecked(res.target.checked ? 1 : -1);
								}}
							/>
						</div>
						<ul className='season-block__episodes-ul'>
							{showSeason?.episodes
								?.map((episode, counter) => (
									<li className='season-block__episode' key={counter}>
										<DetailEpisodeRow
											episode={episode}
											showID={showID}
											loggedIn={loggedIn}
											userInfo={getEpisodeByID(showUserInfo?.episodes, episode?.id)}
											setEpisodeUserStatus={setEpisodesStatus}
											checkAll={isChecked}
											userWatchedShow={userWatchedShow}
											setSaveEpisodes={setSaveEpisodes}
										/>
									</li>
								))
								.reverse()}
						</ul>
					</details>
				</div>
			</LoadingOverlay>
		);
	}
);

export default SeasonBlock;
