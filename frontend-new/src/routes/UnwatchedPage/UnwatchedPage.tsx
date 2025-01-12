import React, {useCallback, useMemo} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {useComponents, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import ShowBlock from './views/ShowBlock';
import "./unwatched-page.scss";

function UnwatchedPage() {
	const {http} = useComponents();
	const user = useSelector(getUser);

	const fetchConfig = useMemo(() => user && ({
		url: `/shows/show/unwatched_episodes/`,
		method: 'get',
	}), [user]);
	const {data: unwatched, isLoading} = useFetch(fetchConfig);

	const setEpisodesStatus = useCallback((showId: string, episodesList: any[]) => {
		http.send(
			'PUT',
			`/shows/show/${showId}/episodes/`,
			episodesList,
		)
	}, []);

	return (
		<div className='unwatched-page'>
			<div className='unwatched-page__body'>
				<h1 className='unwatched-page__header'>
					Непросмотренные серии
				</h1>
				<LoadingOverlay
					active={isLoading}
					spinner
					text='Загрузка...'
				>
					{unwatched?.map((show) => (
						<ShowBlock
							show={show}
							setShowEpisodeUserStatus={setEpisodesStatus}
							loggedIn={!!user}
							key={show.id}
							className='unwatched-page__show-block'
						/>
					))}
				</LoadingOverlay>
			</div>
		</div>
	);
}

export default UnwatchedPage;
