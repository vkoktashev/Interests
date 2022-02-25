import React, { useEffect } from "react";
import { observer } from "mobx-react";
import { toast } from "react-toastify";
import LoadingOverlay from "react-loading-overlay";

import AuthStore from '../../store/AuthStore';
import CurrentUserStore from '../../store/CurrentUserStore';
import ShowStore from '../../store/ShowStore';
import ShowBlock from './views/ShowBlock';

import "./unwatched-page.sass";

const UnwatchedPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { unwatched, requestUnwatched, unwatchedState } = CurrentUserStore;
	const { setEpisodesStatus } = ShowStore;

	useEffect(() => {
		if (unwatchedState.startsWith("error:")) toast.error(`Ошибка загрузки! ${unwatchedState}`);
	}, [unwatchedState]);

	useEffect(
		() => {
			if (loggedIn) requestUnwatched();
		},
		// eslint-disable-next-line
		[loggedIn]
	);

	return (
		<div className='unwatched-page'>
			<div className='unwatched-page__body'>
				<h1 className='unwatched-page__header'>Непросмотренные серии</h1>
				<LoadingOverlay active={unwatchedState === "pending"} spinner text='Загрузка...'>
					{unwatched.map((show) => (
						<ShowBlock show={show} setShowEpisodeUserStatus={setEpisodesStatus} loggedIn={loggedIn} key={show.id} className='unwatched-page__show-block' />
					))}
				</LoadingOverlay>
			</div>
		</div>
	);
});

export default UnwatchedPage;
