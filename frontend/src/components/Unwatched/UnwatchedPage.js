import React, { useEffect } from "react";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import CurrentUserStore from "../../store/CurrentUserStore";
import ShowStore from "../../store/ShowStore";

import { toast } from "react-toastify";
import LoadingOverlay from "react-loading-overlay";
import ShowBlock from "./ShowBlock";

const UnwatchedPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { unwatched, requestUnwatched, unwatchedState } = CurrentUserStore;
	const { setShowEpisodesStatus } = ShowStore;

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
		<div>
			<div className='bg textureBG' />
			<div className='unwatchedPage'>
				<div className='unwatchedBlock'>
					<h1>Непросмотренные серии</h1>
					<LoadingOverlay active={unwatchedState === "pending"} spinner text='Загрузка...'>
						{unwatched.map((show) => (
							<ShowBlock show={show} setShowEpisodeUserStatus={setShowEpisodesStatus} loggedIn={loggedIn} key={show.id} />
						))}
					</LoadingOverlay>
				</div>
			</div>
		</div>
	);
});

export default UnwatchedPage;
