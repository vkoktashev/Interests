import useUnsavedChanges from 'hooks/useUnsavedChanges';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import {Button, Form} from '@steroidsjs/core/ui/form';
import {formChange, formSubmit} from '@steroidsjs/core/actions/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {openModal} from '@steroidsjs/core/actions/modal';

import ShowBlock from './views/ShowBlock';
import {ISetEpisodesPayload, IUnwatchedShow} from './views/types';
import pluralizeRu from './views/pluralizeRu';
import LoginForm from '../../modals/LoginForm';
import {isSessionExpiredError} from '../../components/SafeJwtHttpComponent';
import {saveFailedNotification, savedNotification} from '../../shared/saveNotifications';
import './unwatched-page.scss';

const FORM_ID = 'unwatchedEpisodesForm';

function UnwatchedPage() {
	const bem = useBem('UnwatchedPage');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const [buttonIsLoading, setButtonLoading] = useState(false);
	const [pendingFormValues, setPendingFormValues] = useState<Record<string, boolean> | null>(null);
	const user = useSelector(getUser);
	const isAuthorized = Boolean(user?.id);
	const formValues = useSelector(state => getFormValues(state, FORM_ID) || {});
	const checkedKeys = useMemo(() => Object.entries(formValues).filter(([, value]) => Boolean(value)), [formValues]);
	const checkedCount = checkedKeys.length;
	const hasCheckedEpisodes = checkedCount > 0;

	useUnsavedChanges(isAuthorized && hasCheckedEpisodes);

	const fetchConfig = useMemo(() => (isAuthorized ? {
		url: '/shows/show/unwatched_episodes/',
		method: 'get',
	} : null), [isAuthorized]);
	const {data, isLoading} = useFetch(fetchConfig);
	const unwatchedShows = (Array.isArray(data) ? data : []) as IUnwatchedShow[];
	const [markedEpisodeIds, setMarkedEpisodeIds] = useState<Set<number>>(() => new Set());

	useEffect(() => {
		setMarkedEpisodeIds(new Set());
	}, [data]);

	const visibleShows = useMemo(() => unwatchedShows.flatMap(show => {
		let markedCount = 0;
		const seasons = (show.seasons || []).flatMap(season => {
			const episodes = (season.episodes || []).filter(episode => !markedEpisodeIds.has(episode.tmdb_id));
			markedCount += (season.episodes?.length || 0) - episodes.length;
			return episodes.length > 0 ? [{...season, episodes}] : [];
		});
		if (seasons.length === 0) {
			return [];
		}
		return markedCount > 0
			? [{...show, seasons, watched_episodes_count: Number(show.watched_episodes_count || 0) + markedCount}]
			: [show];
	}), [unwatchedShows, markedEpisodeIds]);

	const stats = useMemo(() => {
		return visibleShows.reduce((acc, show) => {
			acc.shows += 1;
			acc.seasons += show.seasons?.length || 0;
			acc.episodes += show.seasons?.reduce((sum, season) => sum + (season.episodes?.length || 0), 0) || 0;
			return acc;
		}, {shows: 0, seasons: 0, episodes: 0});
	}, [visibleShows]);

	const setEpisodesStatus = useCallback(async (showId: string, payload: ISetEpisodesPayload) => {
		await http.send('PUT', `/shows/show/${showId}/episodes/`, payload);
	}, [http]);

	const hideWatchedEpisodes = useCallback((showId: string, payload: ISetEpisodesPayload) => {
		const watchedEpisodes = payload.episodes.filter(episode => episode.score > -1);
		watchedEpisodes.forEach(episode => dispatch(formChange(FORM_ID, [showId, episode.tmdb_id].join('_'), false)));
		setMarkedEpisodeIds(prev => {
			const next = new Set(prev);
			watchedEpisodes.forEach(episode => next.add(episode.tmdb_id));
			return next;
		});
	}, [dispatch]);

	const setEpisodeScore = useCallback(async (showId: string, payload: ISetEpisodesPayload) => {
		try {
			await setEpisodesStatus(showId, payload);
			dispatch(savedNotification());
			hideWatchedEpisodes(showId, payload);
		} catch (error) {
			if (!isSessionExpiredError(error))
				dispatch(saveFailedNotification());
			throw error;
		}
	}, [dispatch, setEpisodesStatus, hideWatchedEpisodes]);

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

		const results = await Promise.all(
			Array.from(showsMap.entries()).map(async ([showId, episodes]) => {
				try {
					await setEpisodesStatus(showId, {episodes});
					hideWatchedEpisodes(showId, {episodes});
					return {showId, episodes, status: 'saved'};
				} catch (error) {
					return {
						showId,
						episodes,
						status: isSessionExpiredError(error) ? 'sessionExpired' : 'failed',
					};
				}
			})
		);
		if (results.some(result => result.status === 'sessionExpired')) {
			const failedValues = results.reduce((result, showResult) => {
				if (showResult.status !== 'saved')
					showResult.episodes.forEach(episode => {
						result[[showResult.showId, episode.tmdb_id].join('_')] = true;
					});

				return result;
			}, {} as Record<string, boolean>);
			setPendingFormValues(failedValues);
		} else if (results.some(result => result.status === 'failed')) {
			dispatch(showNotification('Не удалось сохранить все отметки. Повторите сохранение.', 'error'));
		} else {
			setPendingFormValues(null);
			dispatch(savedNotification());
		}
		setButtonLoading(false);
	}, [dispatch, setEpisodesStatus, hideWatchedEpisodes]);

	if (!isAuthorized) {
		return (
			<div className={bem.block()}>
				<div className={bem.element('body')}>
					<section className={bem.element('hero')}>
						<div>
							<h1 className={bem.element('title')}>Непросмотренные серии</h1>
							<p className={bem.element('subtitle')}>
								Войдите в аккаунт, чтобы видеть персональный список непросмотренных серий.
							</p>
						</div>
					</section>

					<div className={bem.element('empty')}>
						<Button onClick={() => dispatch(openModal(LoginForm))}>
							Войти
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={bem.block()}>
			<Form
				className={bem.element('body')}
				formId={FORM_ID}
				initialValues={pendingFormValues || undefined}
				onSubmit={onSubmit}
				useRedux
				autoDestroy
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
							<span className={bem.element('stat-label')}>
								{pluralizeRu(stats.shows, 'сериал', 'сериала', 'сериалов')}
							</span>
						</div>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-value')}>{stats.seasons}</span>
							<span className={bem.element('stat-label')}>
								{pluralizeRu(stats.seasons, 'сезон', 'сезона', 'сезонов')}
							</span>
						</div>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-value')}>{stats.episodes}</span>
							<span className={bem.element('stat-label')}>
								{pluralizeRu(stats.episodes, 'серия', 'серии', 'серий')}
							</span>
						</div>
					</div>
				</section>

				<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
					{visibleShows.length > 0 ? (
						<div className={bem.element('shows')}>
							{visibleShows.map(show => (
								<ShowBlock
									show={show}
									setShowEpisodeUserStatus={setEpisodeScore}
									loggedIn={isAuthorized}
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
						Отмечено: {checkedCount} {pluralizeRu(checkedCount, 'серия', 'серии', 'серий')}
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
