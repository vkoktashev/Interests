import React, { useEffect } from "react";

import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";

import LoadingOverlay from "react-loading-overlay";
import "./style.css";
import ShowBlock from "./ShowBlock";

function UnwatchedPage({ loggedIn, episodes, getEpisodes, episodesIsLoading, setShowEpisodeUserStatus }) {
	useEffect(
		() => {
			if (loggedIn) getEpisodes();
		},
		// eslint-disable-next-line
		[loggedIn]
	);

	return (
		<div>
			<div className='bg searchBG' />
			<div className='unwatchedPage'>
				<div className='unwatchedBlock'>
					<h1>Непросмотренные серии</h1>
					<LoadingOverlay active={episodesIsLoading} spinner text='Загрузка...'>
						{episodes.map((show) => (
							<ShowBlock show={show} setShowEpisodeUserStatus={setShowEpisodeUserStatus} loggedIn={loggedIn} key={show.id} />
						))}
					</LoadingOverlay>
				</div>
			</div>
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	episodes: selectors.getUserUnwatched(state),
	episodesIsLoading: selectors.getIsLoadingUserUnwatched(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		getEpisodes: () => {
			dispatch(actions.requestUserUnwatched());
		},
		setShowEpisodeUserStatus: (status, showID) => {
			dispatch(actions.setShowEpisodesStatus(status, showID));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(UnwatchedPage);
