import React, {useCallback, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import ShowBlock from './views/ShowBlock';
import "./unwatched-page.scss";
import {getFormValues} from '@steroidsjs/core/reducers/form';
import {Button, Form} from '@steroidsjs/core/ui/form';
import {formReset, formSubmit} from '@steroidsjs/core/actions/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';

const FORM_ID = 'unwatchedEpisodesForm';

function UnwatchedPage() {
	const bem = useBem('UnwatchedPage');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const [buttonIsLoading, setButtonLoading] = useState(false);
	const user = useSelector(getUser);
	const hasCheckedEpisodes = useSelector(state => (
		!!Object.values(getFormValues(state, FORM_ID) || {})
			.filter(Boolean)
			.length
	));

	const fetchConfig = useMemo(() => user && ({
		url: `/shows/show/unwatched_episodes/`,
		method: 'get',
	}), [user]);
	const {data: unwatched, isLoading, fetch} = useFetch(fetchConfig);

	const setEpisodesStatus = useCallback(async (showId: string, episodesList: any[]) => {
		await http.send(
			'PUT',
			`/shows/show/${showId}/episodes/`,
			episodesList,
		);
	}, []);

	const onSubmit = useCallback(async (values) => {
		setButtonLoading(true);
		const shows = [];
		Object.entries(values).forEach(([key, value]) => {
			if (!value) {
				return;
			}

			const [showId, episodeId] = key.split('_');
			const show = shows.find(show => show.showId === showId);
			if (!show) {
				shows.push({
					showId,
					episodesList: [{
						tmdb_id: +episodeId,
						score: 0,
					}],
				})
			} else {
				show.episodesList.push({
					tmdb_id: +episodeId,
					score: 0,
				});
			}
		});

		for (const show of shows) {
			await setEpisodesStatus(show.showId, {
				episodes: show.episodesList,
			} as any).catch(error => {
				dispatch(showNotification(String(error), 'error'));
			});
		}

		dispatch(formReset(FORM_ID));
		setButtonLoading(false);
		fetch();
	}, [setEpisodesStatus, fetch, dispatch]);

	return (
		<div className={bem.block()}>
			<Form
				className={bem.element('body')}
				formId={FORM_ID}
				onSubmit={onSubmit}
				useRedux
			>
				<h1 className={bem.element('header')}>
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
							className={bem.element('show-block')}
						/>
					))}
				</LoadingOverlay>
				<div
					className={bem.element('save-episodes-block', {
						hidden: !hasCheckedEpisodes,
					})}
				>
					<Button
						className={bem.element('save-episodes-button')}
						onClick={() => dispatch(formSubmit(FORM_ID))}
						isLoading={buttonIsLoading}
					>
						Сохранить
					</Button>
				</div>
			</Form>
		</div>
	);
}

export default UnwatchedPage;
