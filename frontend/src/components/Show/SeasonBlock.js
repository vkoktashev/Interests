import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import { computed } from "mobx";
import AuthStore from "../../store/AuthStore";
import ShowStore from "../../store/ShowStore";
import PagesStore from "../../store/PagesStore";

import { MDBIcon } from "mdbreact";
import "./style.css";
import LoadingOverlay from "react-loading-overlay";
import DetailedEpisodeRow from "./DetailedEpisodeRow";
import Rating from "react-rating";

const SeasonBlock = observer(({ showID, seasonNumber, onChangeStatus, userWatchedShow }) => {
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;
	const { requestShowSeasons, requestShowSeasonsUserInfo, setShowEpisodesStatus, setShowSeasonStatus } = ShowStore;
	const showSeason = computed(() => ShowStore.getShowSeason(seasonNumber)).get();
	const showSeasonIsLoading = computed(() => ShowStore.getShowSeasonIsLoading(seasonNumber)).get();
	const showUserInfo = computed(() => ShowStore.getShowSeasonUserInfo(seasonNumber)).get();

	let history = useHistory();
	const [isChecked, setIsChecked] = useState(0);
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
			setIsChecked(0);
			setUserRate(0);
			requestShowSeasons(showID, seasonNumber);
		},
		// eslint-disable-next-line
		[showID, seasonNumber, requestShowSeasons]
	);

	useEffect(
		() => {
			setIsChecked(0);
			setUserRate(0);
			if (loggedIn) requestShowSeasonsUserInfo(showID, seasonNumber);
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

	function getEpisodeByNumber(episodes, number) {
		for (let episode in episodes) if (episodes[episode].episode_number === number) return episodes[episode];
	}

	return (
		<LoadingOverlay active={showSeasonIsLoading} spinner text='Загрузка...'>
			<div key={showSeason?.tmdb?.id} className='seasonBlock'>
				<a
					href={window.location.origin + "/show/" + showID + "/season/" + seasonNumber}
					onClick={(e) => {
						history.push("/show/" + showID + "/season/" + seasonNumber);
						e.preventDefault();
					}}
					className='seasonBlockName'>
					<h5> {showSeason?.tmdb?.name} </h5>
				</a>
				<div hidden={!loggedIn || !userWatchedShow} className='seasonBlockName'>
					<Rating
						stop={10}
						emptySymbol={<MDBIcon far icon='star' size='1x' />}
						fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
							<MDBIcon icon='star' size='1x' title={n} />
						))}
						initialRating={userRate}
						onChange={(score) => {
							if (!loggedIn) {
								openLoginForm();
							} else {
								setUserRate(score);
								setShowSeasonStatus({ score: score }, showID, seasonNumber);
							}
						}}
					/>
				</div>
				<br />
				<details open={true} className='episodeRows'>
					<summary>Развернуть</summary>
					<div style={{ marginLeft: "5px" }} hidden={!loggedIn || !userWatchedShow}>
						Выбрать все&nbsp;
						<input
							type='checkbox'
							checked={isChecked > 0}
							onChange={(res) => {
								setIsChecked(res.target.checked ? 1 : -1);
							}}
						/>
					</div>
					<ul>
						{showSeason?.tmdb?.episodes
							?.map((episode, counter) => (
								<li className='episode' key={counter}>
									<DetailedEpisodeRow
										episode={episode}
										showID={showID}
										loggedIn={loggedIn}
										userInfo={getEpisodeByNumber(showUserInfo?.episodes, episode?.episode_number)}
										setShowEpisodeUserStatus={setShowEpisodesStatus}
										onChangeStatus={(status) => onChangeStatus(status)}
										checkAll={isChecked}
										userWatchedShow={userWatchedShow}
									/>
								</li>
							))
							.reverse()}
					</ul>
				</details>
			</div>
		</LoadingOverlay>
	);
});

export default SeasonBlock;
