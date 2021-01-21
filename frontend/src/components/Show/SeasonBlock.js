import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { MDBIcon } from "mdbreact";
import "./style.css";
import { connect } from "react-redux";
import LoadingOverlay from "react-loading-overlay";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";
import DetailedEpisodeRow from "./DetailedEpisodeRow";
import Rating from "react-rating";

function SeasonBlock({
	showID,
	seasonNumber,
	loggedIn,
	openLoginForm,
	showSeason,
	showSeasonIsLoading,
	showUserInfo,
	requestShowSeason,
	requestShowSeasonUserInfo,
	setShowEpisodeUserStatus,
	onChangeStatus,
	setShowSeasonUserStatus,
	userWatchedShow,
}) {
	let history = useHistory();
	const [isChecked, setIsChecked] = useState(0);
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
			setIsChecked(0);
			setUserRate(0);
			requestShowSeason(showID, seasonNumber);
		},
		// eslint-disable-next-line
		[showID, seasonNumber, requestShowSeason]
	);

	useEffect(
		() => {
			setIsChecked(0);
			setUserRate(0);
			if (loggedIn) requestShowSeasonUserInfo(showID, seasonNumber);
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
								setShowSeasonUserStatus({ score: score }, showID, seasonNumber);
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
										setShowEpisodeUserStatus={setShowEpisodeUserStatus}
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
}

const mapStateToProps = (state, ownProps) => ({
	loggedIn: selectors.getLoggedIn(state),
	showSeason: selectors.getContentShowSeasons(state, ownProps.seasonNumber),
	showSeasonIsLoading: selectors.getIsLoadingContentShowSeasons(state, ownProps.seasonNumber),
	showUserInfo: selectors.getContentShowSeasonsUserInfo(state, ownProps.seasonNumber),
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShowSeason: (showID, seasonNumber) => {
			dispatch(actions.requestShowSeasons(showID, seasonNumber));
		},
		requestShowSeasonUserInfo: (showID, seasonNumber) => {
			dispatch(actions.requestShowSeasonsUserInfo(showID, seasonNumber));
		},
		setShowSeasonUserStatus: (status, showID, seasonNumber) => {
			dispatch(actions.setShowSeasonStatus(status, showID, seasonNumber));
		},
		setShowEpisodeUserStatus: (status, showID) => {
			dispatch(actions.setShowEpisodesStatus(status, showID));
		},
		openLoginForm: () => {
			dispatch(actions.openLoginForm());
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(SeasonBlock);
