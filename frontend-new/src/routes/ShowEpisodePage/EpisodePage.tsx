import useSavedValues from 'hooks/useSavedValues';
import useUnsavedChanges from 'hooks/useUnsavedChanges';
import useSerialUpdates, {mergeEpisodesPayload} from 'hooks/useSerialUpdates';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {Loader} from '@steroidsjs/core/ui/layout';
import {useBem, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {Link} from '@steroidsjs/core/ui/nav';
import {openModal} from '@steroidsjs/core/actions/modal';

import Rating from '../../shared/Rating';
import FriendsActivity from '../../shared/FriendsActivity';
import ScoreBlock from '../../shared/ScoreBlock';
import LazyTrailersBlock from '../../shared/LazyTrailersBlock';
import {ROUTE_SHOW, ROUTE_SHOW_SEASON} from '../index';
import LoginForm from '../../modals/LoginForm';
import "./episode-page.scss";
import {TextField} from '@steroidsjs/core/ui/form';
import SaveDock from '../../shared/SaveDock';



const episodeFields = ({episodes: [episode]}) => {
	const fields = {...episode};
	delete fields.tmdb_id;
	return fields;
};

function EpisodePage() {
	const bem = useBem('episode-page');
	const dispatch = useDispatch();
	const user = useSelector(getUser);

	const { showId, showSeasonId, showEpisodeId } = useSelector(getRouteParams);
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(-1);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);

	const showEpisodeFetchConfig = useMemo(() => showId && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/episode/${showEpisodeId}/`,
		method: 'get',
	}), [showId, showSeasonId, showEpisodeId]);
	const {data: showEpisode, isLoading} = useFetch(showEpisodeFetchConfig);

	const userInfoFetchConfig = useMemo(() => showId && user && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/episode/${showEpisodeId}/user_info/`,
		method: 'get',
	}), [showId, showSeasonId, showEpisodeId, user]);
	const {data: userInfoResponse, isLoading: userInfoIsLoading} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const confirmedRate = useRef(-1);
	const sentRate = useRef<number>();
	const {sendUpdate, pickFromSnapshot} = useSerialUpdates(`/shows/show/${showId}/episodes/`, {
		key: `/shows/show/${showId}/episodes/${showEpisodeId}`,
		merge: mergeEpisodesPayload,
		toFields: episodeFields,
		// The episodes endpoint returns no body, so a successful burst confirms what was sent
		onSettled: ({failed}) => {
			if (!failed && sentRate.current !== undefined) confirmedRate.current = sentRate.current;
			sentRate.current = undefined;
			setUserRate(confirmedRate.current);
		},
	});
	const {savedValues: savedReview, markSaved: markReviewSaved} = useSavedValues({review: userInfo?.review || ''}, `${user?.id}:${showId}:${showSeasonId}:${showEpisodeId}`);
	const hasChanges = review !== savedReview.review;
	useUnsavedChanges(hasChanges);
	useEffect(() => {
		if (!hasChanges) setSaveError('');
	}, [hasChanges]);
	const [isSaving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');

	const saveChanges = useCallback(async () => {
		setSaving(true);
		setSaveError('');
		try {
			await sendUpdate({episodes: [{tmdb_id: showEpisode?.id, review}]}, {notify: true});
			markReviewSaved({review});
		} catch {
			setSaveError('Не удалось сохранить отзыв. Повторите сохранение.');
		} finally {
			setSaving(false);
		}
	}, [sendUpdate, showEpisode?.id, review, markReviewSaved]);

	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);
	const usersInfo = useMemo(() => userInfoResponse?.users_info, [userInfoResponse]);
	const userWatchedShow = useMemo(() => userInfoResponse?.user_watched_show, [userInfoResponse]);

	const setEpisodeScore = useCallback((score) => {
		sentRate.current = score;
		sendUpdate({episodes: [{tmdb_id: showEpisode?.id, score}]}, {notify: true}).catch(() => {});
	}, [sendUpdate, showEpisode?.id]);

	useEffect(() => {
		setReview("");
		setUserRate(-1);
		sentRate.current = undefined;
	}, [showId, showSeasonId, showEpisodeId]);

	useEffect(() => {
		if (showEpisode?.show?.tmdb_name && showEpisode?.name) {
			document.title = `${showEpisode.show.tmdb_name} - ${showEpisode.name}`;
		}
	}, [showEpisode?.name, showEpisode?.show?.tmdb_name]);

	useEffect(() => {
		setOverviewExpanded(false);
	}, [showId, showSeasonId, showEpisodeId]);

	useEffect(() => {
		confirmedRate.current = userInfo?.score > -1 ? userInfo.score : -1;
		const values = pickFromSnapshot({score: confirmedRate.current, review: userInfo?.review || ''});
		if ('score' in values) setUserRate(values.score);
		if ('review' in values) setReview(values.review);
	}, [userInfo, pickFromSnapshot]);

	const infoRows = useMemo(() => ([
		{label: 'Дата выхода', value: showEpisode?.air_date},
		{label: 'Продолжительность', value: showEpisode?.runtime ? `${showEpisode.runtime} мин` : ''},
		{
			label: 'Сезон',
			value: (
				<Link
					toRoute={ROUTE_SHOW_SEASON}
					toRouteParams={{showId, showSeasonId}}
				>
					{showEpisode?.season_number}
				</Link>
			),
		},
		{label: 'Номер серии', value: showEpisode?.episode_number},
	]).filter(item => item.value !== undefined && item.value !== null && item.value !== ''), [
		showEpisode?.air_date,
		showEpisode?.runtime,
		showEpisode?.season_number,
		showEpisode?.episode_number,
		showId,
		showSeasonId,
	]);

	const overviewPlainText = useMemo(
		() => String(showEpisode?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
		[showEpisode?.overview]
	);
	const canCollapseOverview = overviewPlainText.length > 420;

	if (!showEpisode) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div
				className={bem.element('background')}
				style={{ backgroundImage: `url(${showEpisode?.show?.tmdb_backdrop_path})` }}
			/>
			<LoadingOverlay
				active={isLoading}
				spinner
				text='Загрузка...'
			>
				<div className={bem.element('body')}>
					<div className={bem.element('header')}>
						<div className={bem.element('poster')}>
							<img
								src={showEpisode?.still_path}
								className={bem.element('poster-img')}
								alt=''
							/>
						</div>
						<div className={bem.element('info')}>
							<div className={bem.element('title-row')}>
								<div className={bem.element('title-block')}>
									<h1 className={bem.element('info-header')}>
										<Link
											toRoute={ROUTE_SHOW}
											toRouteParams={{
												showId,
											}}>
											{showEpisode?.show?.tmdb_name}
										</Link>
										{" - " + showEpisode?.name}
									</h1>
									<div className={bem.element('info-subheader')}>
										{showEpisode?.show?.tmdb_original_name + " - Season " + showEpisode?.season_number + " - Episode " + showEpisode?.episode_number}
									</div>
								</div>
								<ScoreBlock
									score={showEpisode?.score}
									text='TMDB score'
									className={bem.element('info-score')}
								/>
							</div>

							<div className={bem.element('info-panel')}>
								<div className={bem.element('info-list')}>
									{infoRows.map(item => (
										<div key={item.label} className={bem.element('info-row')}>
											<span className={bem.element('info-row-label')}>{item.label}</span>
											<span className={bem.element('info-row-value')}>{item.value}</span>
										</div>
									))}
								</div>
							</div>

							<div className={bem.element('actions')} hidden={!user}>
								<LoadingOverlay
									active={userInfoIsLoading && !isLoading}
									spinner
									text='Загрузка...'
								>
									<div className={bem.element('actions-group')}>
										<div className={bem.element('actions-rating')}>
										<Rating
											withEye={true}
											initialRating={userRate}
											disabled={!userWatchedShow}
											onChange={(score) => {
												if (!user) {
													dispatch(openModal(LoginForm));
												} else {
													setUserRate(score);
													setEpisodeScore(score);
												}
											}}
											className={bem.element('rating')}
										/>
										</div>
									</div>
								</LoadingOverlay>
							</div>
						</div>
					</div>

					<LazyTrailersBlock
						endpoint={`/shows/show/${showId}/season/${showSeasonId}/episode/${showEpisodeId}/trailers/`}
					/>

					<div className={bem.element('overview')}>
						<div className={bem.element('content-grid')}>
							<div className={bem.element('main-column')}>
								<section className={bem.element('content-card', {description: true})}>
									<h3 className={bem.element('overview-header')}>Описание</h3>
									<div
										className={bem.element('overview-content', {
											collapsed: canCollapseOverview && !isOverviewExpanded,
										})}
										dangerouslySetInnerHTML={{ __html: showEpisode?.overview }}
									/>
									<div className={bem.element('overview-actions')} hidden={!canCollapseOverview}>
										<button
											type='button'
											className={bem.element('overview-toggle')}
											onClick={() => setOverviewExpanded(prev => !prev)}
										>
											{isOverviewExpanded ? 'Свернуть' : 'Показать полностью'}
										</button>
									</div>
								</section>

								<section className={bem.element('content-card', {review: true})} hidden={!user}>
									<h3 className={bem.element('review-header')}>Отзыв</h3>
									<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
										<div className={bem.element('review-body')}>
											<TextField
												value={review}
												placeholder={userWatchedShow ? 'Напишите отзыв…' : 'Выберите статус сериала, чтобы написать отзыв'}
												disabled={isSaving || !userWatchedShow}
												onChange={(value) => setReview(value)}
											/>
										</div>
									</LoadingOverlay>
								</section>
							</div>

							<div className={bem.element('side-column')}>
								<section className={bem.element('content-card', {friends: true})} hidden={!user}>
									<h4 className={bem.element('friends-header')}>Отзывы друзей</h4>
									{friendsInfo?.length > 0 ? (
										<FriendsActivity info={friendsInfo} isEpisode />
									) : (
										<div className={bem.element('friends-empty')}>
										Никто из друзей ещё не смотрел эту серию
									</div>
								)}
							</section>

							<section className={bem.element('content-card', {friends: true})} hidden={!user}>
								<h4 className={bem.element('friends-header')}>Отзывы пользователей</h4>
								{usersInfo?.length > 0 ? (
									<FriendsActivity info={usersInfo} isEpisode />
								) : (
									<div className={bem.element('friends-empty')}>
										Другие пользователи ещё не смотрели эту серию
									</div>
								)}
							</section>
						</div>
						</div>
						<SaveDock
							visible={!!user && !!userWatchedShow && (hasChanges || isSaving)}
							isSaving={isSaving}
							error={saveError}
							onSave={saveChanges}
						/>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default EpisodePage;
