import useSavedValues from 'hooks/useSavedValues';
import useUnsavedChanges, {STATUS_RESET_MESSAGE} from 'hooks/useUnsavedChanges';
import useSerialUpdates from 'hooks/useSerialUpdates';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {SiThemoviedatabase} from 'react-icons/si';

import SaveDock from '../../shared/SaveDock';
import StatusButtonGroup from '../../shared/StatusButtonGroup';
import FriendsActivity from '../../shared/FriendsActivity';
import ScoreBlock from '../../shared/ScoreBlock';
import AgeRatingBlock from '../../shared/AgeRatingBlock';
import Rating from '../../shared/Rating';
import TmdbRecommendationsBlock from '../../shared/TmdbRecommendationsBlock/TmdbRecommendationsBlock';
import LazyTrailersBlock from '../../shared/LazyTrailersBlock';
import PersonCard, {IPersonCardItem} from '../../shared/PersonCard';
import CastModal from '../../modals/CastModal';
import AddToCollectionButton from '../../shared/AddToCollectionButton';
import ItemCollectionsBlock from '../../shared/ItemCollectionsBlock';

import "./movie-page.scss";
import {useBem, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParam} from '@steroidsjs/core/reducers/router';
import {Loader} from '@steroidsjs/core/ui/layout';
import {openModal} from '@steroidsjs/core/actions/modal';
import LoginForm from '../../modals/LoginForm';
import {TextField} from '@steroidsjs/core/ui/form';

export function MoviePage() {
	const bem = useBem('movie-page');
	const pageRef = useRef<HTMLDivElement>(null);
	const user = useSelector(getUser);
	const dispatch = useDispatch();
	const movieId = useSelector(state => getRouteParam(state, 'movieId'));
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);
	const [userWatchCount, setUserWatchCount] = useState(0);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);
	const [isMobileViewport, setIsMobileViewport] = useState(false);

	const movieFetchConfig = useMemo(() => movieId && ({
		url: `/movies/movie/${movieId}/`,
		method: 'get',
	}), [movieId]);
	const {data: movie, isLoading} = useFetch(movieFetchConfig);

	const userInfoFetchConfig = useMemo(() => movieId && user && ({
		url: `/movies/movie/${movieId}/user_info/`,
		method: 'get',
	}), [movieId, user]);
	const {data: userInfoResponse, isLoading: userInfoIsLoading} = useFetch(userInfoFetchConfig);
	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const {savedValues: savedReview, markSaved: markReviewSaved} = useSavedValues({review: userInfo?.review || ''}, `${user?.id}:${movieId}`);
	const confirmedState = useRef({status: 'Не смотрел', score: 0, watchCount: 0});
	const {sendUpdate, pickFromSnapshot} = useSerialUpdates(`/movies/movie/${movieId}/`, {
		onSettled: ({data}) => {
			if (data) {
				confirmedState.current = {status: data.status, score: data.score, watchCount: data.watch_count || 0};
				markReviewSaved({review: data.review || ''});
			}
			setUserStatus(confirmedState.current.status);
			setUserRate(confirmedState.current.score);
			setUserWatchCount(confirmedState.current.watchCount);
		},
	});
	const hasReviewChanges = review !== savedReview.review;
	useUnsavedChanges(hasReviewChanges);
	useEffect(() => {
		if (!hasReviewChanges) setSaveError('');
	}, [hasReviewChanges]);
	const [isSaving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');

	const saveReview = useCallback(async () => {
		setSaving(true);
		setSaveError('');
		try {
			await sendUpdate({review}, {notify: true});
			markReviewSaved({review});
		} catch {
			setSaveError('Не удалось сохранить отзыв. Повторите сохранение.');
		} finally {
			setSaving(false);
		}
	}, [sendUpdate, review, markReviewSaved]);

	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);
	const usersInfo = useMemo(() => userInfoResponse?.users_info, [userInfoResponse]);

	const setMovieStatus = useCallback((payload) => {
		sendUpdate(payload, {notify: true}).catch(() => {});
	}, [sendUpdate]);

	useEffect(() => {
		setReview("");
		setUserStatus("Не смотрел");
		setUserRate(0);
		setUserWatchCount(0);
	}, [movieId]);

	useEffect(() => {
			if (!user) {
				setReview("");
				setUserRate(0);
				setUserStatus("Не смотрел");
				setUserWatchCount(0);
			}
		},[user]);

	useEffect(() => {
		if (movie?.name) {
			document.title = movie.name;
		}
	}, [movie?.name]);

	useEffect(() => {
		setOverviewExpanded(false);
	}, [movieId]);

	useEffect(() => {
		const updateViewport = () => {
			if (typeof window === 'undefined') {
				return;
			}
			setIsMobileViewport(window.innerWidth <= 760);
		};

		updateViewport();
		window.addEventListener('resize', updateViewport);
		return () => window.removeEventListener('resize', updateViewport);
	}, []);

	useEffect(
		() => {
			const snapshot = userInfo?.status
				? {status: userInfo.status, score: userInfo.score, watch_count: userInfo.watch_count || 0, review: userInfo.review || ''}
				: {status: 'Не смотрел', score: 0, watch_count: 0, review: ''};
			confirmedState.current = {status: snapshot.status, score: snapshot.score, watchCount: snapshot.watch_count};
			const values = pickFromSnapshot(snapshot);
			if ('status' in values) setUserStatus(values.status);
			if ('score' in values) setUserRate(values.score);
			if ('watch_count' in values) setUserWatchCount(values.watch_count);
			if ('review' in values) setReview(values.review);
		},
		// eslint-disable-next-line
		[userInfo]
	);

	const infoRows = useMemo(() => ([
		{label: 'Дата релиза', value: movie?.release_date},
		{label: 'Цифровой релиз', value: movie?.digital_release_date},
		{label: 'Продолжительность', value: movie?.runtime ? `${movie.runtime} мин` : ''},
		{label: 'Жанр', value: movie?.genres},
		{label: 'Компания', value: movie?.production_companies},
		{label: 'Слоган', value: movie?.tagline},
	]).filter(item => Boolean(item.value)), [
		movie?.release_date,
		movie?.digital_release_date,
		movie?.runtime,
		movie?.genres,
		movie?.production_companies,
		movie?.tagline,
	]);

	const overviewPlainText = useMemo(
		() => String(movie?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
		[movie?.overview]
	);
	const canCollapseOverview = overviewPlainText.length > 420;
	const castPeople = (movie?.cast_people || []) as IPersonCardItem[];
	const directorsPeople = (movie?.directors_people || []) as IPersonCardItem[];
	const peopleLimit = 7;
	const visibleDirectors = directorsPeople.slice(0, peopleLimit);
	const visibleCast = castPeople.slice(0, Math.max(0, peopleLimit - visibleDirectors.length));

	if (!movie) {
		return <Loader />;
	}

	return (
		<div ref={pageRef} className={bem.block()}>
			<div
				className={bem.element('background')}
				style={{ backgroundImage: `url(${movie?.backdrop_path})` }}
			/>
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
				<div className={bem.element('body')}>
					<div className={bem.element('header')}>
						<div className={bem.element('poster')}>
							<img src={movie?.poster_path} className={bem.element('poster-img')} alt='' />
						</div>
						<div className={bem.element('info')}>
							<div className={bem.element('title-row')}>
								<div className={bem.element('title-block')}>
									<h1 className={bem.element('info-header')}>{movie?.name}</h1>
									{!!movie?.original_name && movie?.original_name !== movie?.name && (
										<div className={bem.element('info-subheader')}>{movie?.original_name}</div>
									)}
								</div>
								<div className={bem.element('title-actions')}>
									<AddToCollectionButton
										mediaType='movie'
										objectId={movie.object_id}
										mediaName={movie.name}
									/>
									<AgeRatingBlock rating={movie?.age_rating} className={bem.element('info-score')} />
									<ScoreBlock score={movie?.score} text='TMDB score' className={bem.element('info-score')} />
								</div>
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

								{!!movie?.id && (
									<div className={bem.element('resource-group')}>
										<div className={bem.element('resource-group-label')}>Контент</div>
										<div className={bem.element('media-links')}>
											<a
												className={bem.element('media-link', {tmdb: true})}
												href={`https://www.themoviedb.org/movie/${movie.id}`}
												target='_blank'
												rel='noreferrer'
												title='TMDB'
												aria-label='Открыть на TMDB'
											>
												<SiThemoviedatabase className={bem.element('media-link-icon')} />
											</a>
											{!!movie?.imdb_id && (
												<a
													className={bem.element('media-link', {imdb: true})}
													href={`https://www.imdb.com/title/${movie.imdb_id}/`}
													target='_blank'
													rel='noreferrer'
													title='IMDb'
													aria-label='Открыть на IMDb'
												>
													<span className={bem.element('media-link-label')}>IMDb</span>
												</a>
											)}
										</div>
									</div>
								)}
							</div>

							<div className={bem.element('actions')}>
								<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
									<div className={bem.element('actions-group')}>
										<div className={bem.element('actions-rating')}>
										<Rating
											initialRating={userRate}
											readonly={!user}
											disabled={!!user && userStatus === "Не смотрел"}
											onChange={(score) => {
												setUserRate(score);
												setMovieStatus({ score: score });
											}}
											className={bem.element('rating')}
										/>
										</div>
										<div className={bem.element('actions-statuses')}>
											<StatusButtonGroup
												statuses={["Не смотрел", "Буду смотреть", "Дропнул", "Посмотрел"]}
												className={bem.element('info-statuses')}
												userStatus={userStatus}
												onChangeStatus={(status) => {
													if (status === "Не смотрел" && hasReviewChanges) {
														if (!window.confirm(STATUS_RESET_MESSAGE)) {
															return;
														}
														setReview(savedReview.review);
													}
													if (!user) {
														dispatch(openModal(LoginForm));
													} else {
														setUserStatus(status);
														const watchCount = status === "Посмотрел"
															? Math.max(userWatchCount, 1)
															: userWatchCount;
														setUserWatchCount(watchCount);
														setMovieStatus({
															status: status,
															watch_count: watchCount,
														});
													}
												}}
											/>
										</div>
										{userStatus === "Посмотрел" && (
											<div className={bem.element('actions-watch-count')}>
												<span className={bem.element('actions-watch-count-label')}>
													Количество просмотров
												</span>
												<div className={bem.element('watch-count-control')}>
													<button
														type='button'
														className={bem.element('watch-count-button')}
														disabled={userWatchCount <= 1}
														aria-label='Уменьшить количество просмотров'
														onClick={() => {
															const watchCount = Math.max(1, userWatchCount - 1);
															setUserWatchCount(watchCount);
															setMovieStatus({watch_count: watchCount});
														}}
													>
														−
													</button>
													<span className={bem.element('watch-count-value')}>{userWatchCount}</span>
													<button
														type='button'
														className={bem.element('watch-count-button')}
														aria-label='Увеличить количество просмотров'
														onClick={() => {
															const watchCount = userWatchCount + 1;
															setUserWatchCount(watchCount);
															setMovieStatus({watch_count: watchCount});
														}}
													>
														+
													</button>
												</div>
											</div>
										)}
									</div>
								</LoadingOverlay>
							</div>
						</div>
					</div>

					{(castPeople.length > 0 || directorsPeople.length > 0) && (
						<section className={bem.element('people')}>
							<div className={bem.element('people-head')}>
								<div className={bem.element('people-title')}>Команда фильма</div>
								{castPeople.length > visibleCast.length && (
									<button
										type='button'
										className={bem.element('people-all')}
									onClick={() => dispatch(openModal(CastModal, {
										people: castPeople,
										mediaName: movie?.name,
											pageWidth: pageRef.current?.getBoundingClientRect().width,
										}))}
									>
										Все актёры
										<span className={bem.element('people-count')}>{castPeople.length}</span>
									</button>
								)}
							</div>

							<div className={bem.element('people-line')}>
								{visibleDirectors.length > 0 && (
									<div
										className={bem.element('people-group', {directors: true})}
										style={{'--people-count': visibleDirectors.length} as React.CSSProperties}
									>
										<div className={bem.element('people-group-title')}>Режиссёры</div>
										<div className={bem.element('people-group-list')}>
											{visibleDirectors.map(person => (
												<PersonCard
													key={person.id}
													person={person}
													subtitle='Режиссёр'
													compact
												/>
											))}
										</div>
									</div>
								)}

								{visibleCast.length > 0 && (
									<div
										className={bem.element('people-group', {cast: true})}
										style={{'--people-count': visibleCast.length} as React.CSSProperties}
									>
										<div className={bem.element('people-group-title')}>Актёры</div>
										<div className={bem.element('people-group-list')}>
											{visibleCast.map(person => (
												<PersonCard key={person.id} person={person} compact />
											))}
										</div>
									</div>
								)}
							</div>
						</section>
					)}

					<LazyTrailersBlock
						className={bem.element('media-card')}
						endpoint={`/movies/movie/${movieId}/trailers/`}
						isMobileViewport={isMobileViewport}
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
										dangerouslySetInnerHTML={{ __html: movie?.overview }}
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
										<div className={bem.element('review-body')} hidden={!user}>
											<TextField
												value={review}
												placeholder={userStatus === "Не смотрел" ? 'Выберите статус, чтобы написать отзыв' : 'Напишите отзыв…'}
												disabled={isSaving || userStatus === "Не смотрел"}
												onChange={(value) => setReview(value)}
											/>
										</div>
									</LoadingOverlay>
								</section>

								<TmdbRecommendationsBlock
									className={bem.element('content-card', {tmdbRecommendations: true})}
									itemType='movie'
									title='Рекомендации TMDB'
									endpoint={`/movies/movie/${movieId}/tmdb_recommendations/`}
								/>
							</div>

							<div className={bem.element('side-column')}>
								<section className={bem.element('content-card', {friends: true})} hidden={!user}>
									<h4 className={bem.element('friends-header')}>Отзывы друзей</h4>
									{friendsInfo?.length > 0 ? (
										<FriendsActivity info={friendsInfo} />
									) : (
										<div className={bem.element('friends-empty')}>
											Никто из друзей ещё не смотрел этот фильм
										</div>
									)}
								</section>

								<section className={bem.element('content-card', {friends: true})} hidden={!user}>
									<h4 className={bem.element('friends-header')}>Отзывы пользователей</h4>
									{usersInfo?.length > 0 ? (
										<FriendsActivity info={usersInfo} />
									) : (
										<div className={bem.element('friends-empty')}>
											Другие пользователи ещё не смотрели этот фильм
										</div>
									)}
								</section>

								<ItemCollectionsBlock
									className={bem.element('content-card', {collections: true})}
									mediaType='movie'
									objectId={movie.object_id}
								/>

							</div>
						</div>
						<SaveDock
							visible={!!user && (hasReviewChanges || isSaving)}
							isSaving={isSaving}
							error={saveError}
							onSave={saveReview}
						/>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}
