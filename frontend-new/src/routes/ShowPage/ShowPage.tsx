import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {SiThemoviedatabase} from 'react-icons/si';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {Loader} from '@steroidsjs/core/ui/layout';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import Rating from '../../shared/Rating';
import StatusButtonGroup from '../../shared/StatusButtonGroup';
import FriendsActivity from '../../shared/FriendsActivity';
import SeasonsBlock from './views/SeasonsBlock';
import ScoreBlock from '../../shared/ScoreBlock';
import TmdbRecommendationsBlock from '../../shared/TmdbRecommendationsBlock/TmdbRecommendationsBlock';
import LazyTrailersBlock from '../../shared/LazyTrailersBlock';
import AddToCollectionButton from '../../shared/AddToCollectionButton';
import ItemCollectionsBlock from '../../shared/ItemCollectionsBlock';
import PersonCard, {IPersonCardItem} from '../../shared/PersonCard';
import CastModal from '../../modals/CastModal';
import formatDuration from '../../shared/formatDuration';

import "./show-page.scss";
import LoginForm from '../../modals/LoginForm';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {Button, TextField} from '@steroidsjs/core/ui/form';

/**
 * Основная страница приложения
 */
function ShowPage(props) {
	const bem = useBem('show-page');
	const pageRef = useRef<HTMLDivElement>(null);
    const dispatch = useDispatch();
    const {http} = useComponents();
	const user = useSelector(getUser);
	const { showId } = useSelector(getRouteParams);
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);
	const [isMobileViewport, setIsMobileViewport] = useState(false);
	const [runtimeInfo, setRuntimeInfo] = useState<any>(null);

    const showFetchConfig = useMemo(() => showId && ({
        url: `/shows/show/${showId}/`,
        method: 'get',
    }), [showId]);
    const {data: show, isLoading} = useFetch(showFetchConfig);

    const userInfoFetchConfig = useMemo(() => showId && user && ({
        url: `/shows/show/${showId}/user_info/`,
        method: 'get',
    }), [showId, user]);
    const {data: userInfoResponse, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

    const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
    const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);
    const usersInfo = useMemo(() => userInfoResponse?.users_info, [userInfoResponse]);

    const setShowStatus = useCallback(async (payload) => {
        http.send('PUT', `/shows/show/${showId}/`, payload).catch(e => {
            fetchUserInfo();
        });
    }, [showId]);

	useEffect(() => {
        setReview("");
        setUserStatus("Не смотрел");
        setUserRate(0);
    }, [showId]);

	useEffect(() => {
		if (show?.name) {
			document.title = show.name;
		}
	}, [show?.name]);

	useEffect(() => {
		setOverviewExpanded(false);
		setRuntimeInfo(null);
	}, [showId]);

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

	useEffect(() => {
        if (userInfo?.status) {
            setReview(userInfo.review);
            setUserStatus(userInfo.status);
            setUserRate(userInfo.score);
        } else {
            setReview("");
            setUserRate(0);
            setUserStatus("Не смотрел");
        }
    }, [userInfo]);

	const episodeRuntime = Number(show?.episode_run_time || runtimeInfo?.episodeRuntime || 0);
	const totalRuntime = Number(runtimeInfo?.totalRuntime || 0);
	const remainingRuntime = Number(runtimeInfo?.remainingRuntime || 0);
	const shouldShowRemainingRuntime = user
		&& ["Буду смотреть", "Смотрю", "Посмотрел"].includes(userStatus)
		&& remainingRuntime > 0
		&& remainingRuntime < totalRuntime;
	const infoRows = useMemo(() => ([
        {label: 'Жанр', value: show?.genres},
        {label: 'Компания', value: show?.production_companies},
        {label: 'Первая серия', value: show?.first_air_date},
        {label: 'Последняя серия', value: show?.last_air_date},
        {
            label: 'Длительность серии',
            value: episodeRuntime
                ? `${episodeRuntime} мин`
                : '',
        },
        {
            label: 'Длительность сериала',
            value: runtimeInfo?.totalRuntime
                ? formatDuration(runtimeInfo.totalRuntime)
                : '',
        },
        {
            label: 'Осталось смотреть',
            value: shouldShowRemainingRuntime
                ? formatDuration(runtimeInfo.remainingRuntime)
                : '',
        },
        {label: 'Количество сезонов', value: show?.seasons_count},
        {label: 'Количество серий', value: show?.episodes_count},
        {label: 'Статус', value: show?.status},
    ]).filter(item => Boolean(item.value)), [
        show?.genres,
        show?.production_companies,
        show?.first_air_date,
        show?.last_air_date,
        show?.episode_run_time,
        episodeRuntime,
        runtimeInfo,
        shouldShowRemainingRuntime,
        show?.seasons_count,
        show?.episodes_count,
        show?.status,
    ]);

    const overviewPlainText = useMemo(
        () => String(show?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        [show?.overview]
    );
    const canCollapseOverview = overviewPlainText.length > 420;
    const castPeople = (show?.cast_people || []) as IPersonCardItem[];
    const creatorsPeople = (show?.creators_people || []) as IPersonCardItem[];
    const peopleLimit = 6;
    const visibleCreators = creatorsPeople;
    const visibleCast = castPeople.slice(0, peopleLimit);

    if (!show) {
        return <Loader />;
    }

	return (
		<div ref={pageRef} className={bem.block()}>
			<div
                className={bem.element('background')}
                style={{ backgroundImage: `url(${show?.backdrop_path})` }}
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
                                src={show?.poster_path}
                                className={bem.element('poster-img')}
                                alt=''
                            />
						</div>
						<div className={bem.element('info')}>
							<div className={bem.element('title-row')}>
								<div className={bem.element('title-block')}>
									<h1 className={bem.element('info-header')}>
										{show?.name}
									</h1>
                                    {!!show?.original_name && show?.original_name !== show?.name && (
									    <div className={bem.element('info-subheader')}>
										    {show?.original_name}
									    </div>
                                    )}
								</div>
								<div className={bem.element('title-actions')}>
									<AddToCollectionButton
										mediaType='show'
										objectId={show.object_id}
										mediaName={show.name}
									/>
									<ScoreBlock
										score={show?.score}
										text='TMDB score'
										className={bem.element('info-score')}
									/>
								</div>
							</div>

							<div className={bem.element('info-panel')}>
								<div className={bem.element('info-list')}>
                                    {infoRows.map(item => (
                                        <div key={String(item.label)} className={bem.element('info-row')}>
                                            <span className={bem.element('info-row-label')}>{item.label}</span>
                                            <span className={bem.element('info-row-value')}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>

								{!!show?.id && (
									<div className={bem.element('resource-group')}>
										<div className={bem.element('resource-group-label')}>Контент</div>
										<div className={bem.element('media-links')}>
											<a
												className={bem.element('media-link', {tmdb: true})}
												href={`https://www.themoviedb.org/tv/${show.id}`}
												target='_blank'
												rel='noreferrer'
												title='TMDB'
												aria-label='Открыть на TMDB'
											>
												<SiThemoviedatabase className={bem.element('media-link-icon')} />
											</a>
											{!!show?.imdb_id && (
												<a
													className={bem.element('media-link', {imdb: true})}
													href={`https://www.imdb.com/title/${show.imdb_id}/`}
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
								<LoadingOverlay
									active={userInfoIsLoading && !isLoading}
									spinner
									text='Загрузка...'
								>
									<div className={bem.element('actions-group')}>
                                        <div className={bem.element('actions-rating')}>
										<Rating
											initialRating={userRate}
											readonly={!user || (userStatus === "Не смотрел")}
											onChange={(score) => {
												if (!user) {
													dispatch(openModal(LoginForm));
												} else {
													setUserRate(score);
													setShowStatus({ score: score });
												}
											}}
											className={bem.element('rating')}
										/>
                                        </div>
                                        <div className={bem.element('actions-statuses')}>
										<StatusButtonGroup
											statuses={["Не смотрел", "Буду смотреть", "Смотрю", "Дропнул", "Посмотрел"]}
											className={bem.element('info-statuses')}
											userStatus={userStatus}
											onChangeStatus={(status) => {
												if (!user) {
													dispatch(openModal(LoginForm));
												} else {
													setUserStatus(status);
													setShowStatus({ status: status });
													if (status === "Не смотрел") {
														setReview("");
														setUserRate(0);
													}
												}
											}}
										/>
                                        </div>
									</div>
								</LoadingOverlay>
							</div>
						</div>
					</div>

                    {(castPeople.length > 0 || creatorsPeople.length > 0) && (
                        <section className={bem.element('people')}>
                            <div className={bem.element('people-head')}>
                                <div className={bem.element('people-title')}>Команда сериала</div>
                                {castPeople.length > visibleCast.length && (
                                    <button
                                        type='button'
                                        className={bem.element('people-all')}
                                        onClick={() => dispatch(openModal(CastModal, {
                                            people: castPeople,
                                            mediaName: show?.name,
                                            pageWidth: pageRef.current?.getBoundingClientRect().width,
                                        }))}
                                    >
                                        Все актёры
                                        <span className={bem.element('people-count')}>{castPeople.length}</span>
                                    </button>
                                )}
                            </div>

                            <div className={bem.element('people-line')}>
                                {visibleCreators.length > 0 && (
                                    <div
                                        className={bem.element('people-group', {creators: true})}
                                        style={{'--people-count': visibleCreators.length} as React.CSSProperties}
                                    >
                                        <div className={bem.element('people-group-title')}>Создатели</div>
                                        <div className={bem.element('people-group-list')}>
                                            {visibleCreators.map(person => (
                                                <PersonCard
                                                    key={person.id}
                                                    person={person}
                                                    subtitle='Создатель'
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
                        endpoint={`/shows/show/${showId}/trailers/`}
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
                                        dangerouslySetInnerHTML={{ __html: show?.overview }}
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

                                <section className={bem.element('content-card', {seasons: true})}>
                                    <h3 className={bem.element('seasons-header')}>Список серий</h3>
                                    <SeasonsBlock
                                        key={showId}
                                        showId={showId}
                                        seasons={show?.seasons}
                                        userWatchedShow={userStatus !== "Не смотрел"}
                                        defaultEpisodeRuntime={show?.episode_run_time}
                                        onRuntimeInfoChange={setRuntimeInfo}
                                    />
                                </section>

                                <section className={bem.element('content-card', {review: true})} hidden={!user}>
                                    <h3 className={bem.element('review-header')}>Отзыв</h3>
                                    <LoadingOverlay
                                        active={userInfoIsLoading && !isLoading}
                                        spinner
                                        text='Загрузка...'
                                    >
                                        <div className={bem.element('review-body')}>
                                            <TextField
                                                label={__('Ваш отзыв')}
                                                value={review}
                                                onChange={(value) => setReview(value)}
                                            />
                                            <Button
                                                label={__('Сохранить')}
                                                className={bem.element('button')}
                                                disabled={!user || (userStatus === "Не смотрел")}
                                                onClick={() => {
                                                    if (!user) {
                                                        dispatch(openModal(LoginForm));
                                                    } else {
                                                        setShowStatus({ review: review })
                                                            .then(() => {
                                                                dispatch(showNotification('Отзыв сохранен!', 'success', {
                                                                    position: 'top-right',
                                                                    timeOut: 1000,
                                                                }));
                                                            });
                                                    }
                                                }}
                                            />
                                        </div>
                                    </LoadingOverlay>
                                </section>

                                <TmdbRecommendationsBlock
                                    className={bem.element('content-card', {tmdbRecommendations: true})}
                                    itemType='show'
                                    title='Рекомендации TMDB'
                                    endpoint={`/shows/show/${showId}/tmdb_recommendations/`}
                                />
                            </div>

                            <div className={bem.element('side-column')}>
                                <section className={bem.element('content-card', {friends: true})} hidden={!user}>
                                    <h4 className={bem.element('friends-header')}>Отзывы друзей</h4>
                                    {friendsInfo?.length > 0 ? (
                                        <FriendsActivity info={friendsInfo} />
                                    ) : (
                                        <div className={bem.element('friends-empty')}>
                                            Никто из друзей ещё не смотрел этот сериал
                                        </div>
                                    )}
                                </section>

                                <section className={bem.element('content-card', {friends: true})} hidden={!user}>
                                    <h4 className={bem.element('friends-header')}>Отзывы пользователей</h4>
                                    {usersInfo?.length > 0 ? (
                                        <FriendsActivity info={usersInfo} />
                                    ) : (
                                        <div className={bem.element('friends-empty')}>
                                            Другие пользователи ещё не смотрели этот сериал
                                        </div>
                                    )}
                                </section>

                                <ItemCollectionsBlock
                                    className={bem.element('content-card', {collections: true})}
                                    mediaType='show'
                                    objectId={show.object_id}
                                />

                            </div>
                        </div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default ShowPage;
