import React, {useCallback, useMemo, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import {Button, Form} from '@steroidsjs/core/ui/form';
import {formReset, formSubmit} from '@steroidsjs/core/actions/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';

import ShowBlock from './views/ShowBlock';
import {ISetEpisodesPayload, IUnwatchedShow} from './views/types';
import './unwatched-page.scss';

const FORM_ID = 'unwatchedEpisodesForm';

function UnwatchedPage() {
	const bem = useBem('UnwatchedPage');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const [buttonIsLoading, setButtonLoading] = useState(false);
	const user = useSelector(getUser);
	const formValues = useSelector(state => getFormValues(state, FORM_ID) || {});
	const checkedKeys = useMemo(() => Object.entries(formValues).filter(([, value]) => Boolean(value)), [formValues]);
	const checkedCount = checkedKeys.length;
	const hasCheckedEpisodes = checkedCount > 0;

	const fetchConfig = useMemo(() => (user ? {
		url: '/shows/show/unwatched_episodes/',
		method: 'get',
	} : null), [user]);
	const {data, isLoading, fetch} = useFetch(fetchConfig);
	const unwatchedShows = (Array.isArray(data) ? data : []) as IUnwatchedShow[];

	const stats = useMemo(() => {
		return unwatchedShows.reduce((acc, show) => {
			acc.shows += 1;
			acc.seasons += show.seasons?.length || 0;
			acc.episodes += show.seasons?.reduce((sum, season) => sum + (season.episodes?.length || 0), 0) || 0;
			return acc;
		}, {shows: 0, seasons: 0, episodes: 0});
	}, [unwatchedShows]);

	const setEpisodesStatus = useCallback(async (showId: string, payload: ISetEpisodesPayload) => {
		await http.send('PUT', `/shows/show/${showId}/episodes/`, payload);
	}, [http]);

	const onSubmit = useCallback(async (values: Record<string, boolean>) => {
		setButtonLoading(true);
		const showsMap = new Map<string, Array<{tmdb_id: number; score: number}>>();

		Object.entries(values).forEach(([key, value]) => {
			if (!value) {
				return;
			}

			const [showId, episodeId] = key.split('_');
			if (!showId || !episodeId) {
				return;
			}

			const list = showsMap.get(showId) || [];
			list.push({
				tmdb_id: Number(episodeId),
				score: 0,
			});
			showsMap.set(showId, list);
		});

		try {
			await Promise.all(
				Array.from(showsMap.entries()).map(([showId, episodes]) =>
					setEpisodesStatus(showId, {episodes}).catch(error => {
						dispatch(showNotification(String(error), 'error'));
					})
				)
			);
			dispatch(formReset(FORM_ID));
			fetch();
		} finally {
			setButtonLoading(false);
		}
	}, [dispatch, fetch, setEpisodesStatus]);

	return (
		<div className={bem.block()}>
			<Form
				className={bem.element('body')}
				formId={FORM_ID}
				onSubmit={onSubmit}
				useRedux
			>
				<section className={bem.element('hero')}>
					<div>
						<h1 className={bem.element('title')}>Непросмотренные серии</h1>
						<p className={bem.element('subtitle')}>
							Отмечайте просмотренные серии и сохраняйте изменения одним действием
						</p>
					</div>
					<div className={bem.element('stats')}>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-value')}>{stats.shows}</span>
							<span className={bem.element('stat-label')}>сериалов</span>
						</div>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-value')}>{stats.seasons}</span>
							<span className={bem.element('stat-label')}>сезонов</span>
						</div>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-value')}>{stats.episodes}</span>
							<span className={bem.element('stat-label')}>серий</span>
						</div>
					</div>
				</section>

				<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
					{unwatchedShows.length > 0 ? (
						<div className={bem.element('shows')}>
							{unwatchedShows.map(show => (
								<ShowBlock
									show={show}
									setShowEpisodeUserStatus={setEpisodesStatus}
									loggedIn={!!user}
									key={show.tmdb_id}
									className={bem.element('show-block')}
								/>
							))}
						</div>
					) : (
						<div className={bem.element('empty')}>
							Все серии уже просмотрены
						</div>
					)}
				</LoadingOverlay>

				<div className={bem.element('save-episodes-block', {hidden: !hasCheckedEpisodes})}>
					<div className={bem.element('save-info')}>
						Отмечено серий: {checkedCount}
					</div>
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
