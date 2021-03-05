import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import ShowStore from "../../store/ShowStore";
import PagesStore from "../../store/PagesStore";

import { MDBIcon, MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import { AreaChart, linearGradient, XAxis, Tooltip, YAxis, Area, ResponsiveContainer } from "recharts";
import { toast } from "react-toastify";

import Rating from "react-rating";
import FriendsActivity from "../Common/FriendsActivity";
import DetailedEpisodeRow from "./DetailedEpisodeRow";

/**
 * Основная страница приложения
 */
const SeasonPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { requestSeason, show, showState, setSeasonStatus, setEpisodesStatus, requestSeasonUserInfo, userInfo, userInfoState, friendsInfo, setStatusState } = ShowStore;
	const { openLoginForm, setSaveEpisodes, saveEpisodesBlockIsOpen } = PagesStore;

	let history = useHistory();
	let { show_id, number } = useParams();
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(0);
	const [chartData, setChartData] = useState([]);
	const [isChecked, setIsChecked] = useState(0);

	useEffect(
		() => {
			setReview("");
			setUserRate(0);
			setIsChecked(0);
			requestSeason(show_id, number);
		},
		// eslint-disable-next-line
		[show_id, number, requestSeason]
	);

	useEffect(
		() => {
			if (loggedIn) requestSeasonUserInfo(show_id, number);
			else {
				setReview("");
				setUserRate(0);
				setIsChecked(0);
			}
		},
		// eslint-disable-next-line
		[loggedIn, show_id, number]
	);

	useEffect(() => {
		document.title = show.show?.tmdb_name + " - " + show.name;
	}, [show]);

	useEffect(() => {
		setChartData([]);
		if (show.episodes)
			if (show.episodes.length > 0) {
				let newData = [];
				for (let episode in show.episodes) {
					if (show.episodes[episode].vote_average > 0) newData.push({ name: "Ep " + show.episodes[episode].episode_number, Оценка: show.episodes[episode].vote_average });
				}
				setChartData(newData);
			}
	}, [show]);

	useEffect(
		() => {
			if (userInfo?.review) setReview(userInfo.review);
			else setReview("");

			if (userInfo?.score) setUserRate(userInfo.score);
			else setUserRate(0);
		},
		// eslint-disable-next-line
		[userInfo]
	);

	useEffect(() => {
		if (showState.startsWith("error:")) toast.error(`Ошибка загрузки! ${showState}`);
	}, [showState]);
	useEffect(() => {
		if (userInfoState.startsWith("error:")) toast.error(`Ошибка загрузки пользовательской информации! ${userInfoState}`);
	}, [userInfoState]);
	useEffect(() => {
		if (setStatusState.startsWith("error:")) toast.error(`Ошибка сохранения! ${setStatusState}`);
	}, [setStatusState]);

	function getEpisodeByID(episodes, id) {
		for (let episode in episodes) if (episodes[episode].tmdb_id === id) return episodes[episode];
	}

	function sendEpisodes() {
		let episodes = [];
		for (let episode in userInfo.episodes) {
			let currentValue = userInfo.episodes[episode];
			let cbValue = document.getElementById(`cbEpisode${currentValue.tmdb_id}`).checked;
			if (cbValue === !(currentValue.score > -1)) episodes.push({ tmdb_id: currentValue.tmdb_id, score: cbValue ? 0 : -1 });
		}
		setEpisodesStatus({ episodes }, show_id);
		requestSeasonUserInfo(show_id, number);
		setSaveEpisodes(false);
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${show.show?.tmdb_backdrop_path})` }} />
			<LoadingOverlay active={showState === "pending"} spinner text='Загрузка...'>
				<div className='contentPage'>
					<div className='contentHeader'>
						<div className='posterBlock tightPoster'>
							<img src={show.poster_path} className='img-fluid' alt='' />
						</div>
						<div className='infoBlock wideInfo'>
							<h1 className='header'>
								<a
									href={window.location.origin + "/show/" + show.show?.id}
									onClick={(e) => {
										history.push("/show/" + show.show?.id);
										e.preventDefault();
									}}>
									{show.show?.tmdb_name}
								</a>
								{" - " + show.name}
							</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{show.show?.tmdb_original_name + " - Season " + show.season_number}</h5>
							<div className='mainInfo'>
								<p hidden={!show.air_date}>Дата выхода: {show.air_date}</p>
								<p hidden={!show.episodes}>Количество серий: {show.episodes?.length}</p>
							</div>
							<div hidden={!loggedIn | !userInfo?.user_watched_show}>
								<LoadingOverlay active={userInfoState === "pending" && !showState === "pending"} spinner text='Загрузка...'>
									<Rating
										stop={10}
										emptySymbol={<MDBIcon far icon='star' size='1x' style={{ fontSize: "25px" }} />}
										fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
											<MDBIcon icon='star' size='1x' style={{ fontSize: "25px" }} title={n} />
										))}
										initialRating={userRate}
										onChange={(score) => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setUserRate(score);
												setSeasonStatus({ score: score }, show_id, show.season_number);
											}
										}}
									/>
									<MDBInput type='textarea' id='reviewInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
									<button
										className={"saveReviewButton"}
										hidden={!loggedIn | !userInfo?.user_watched_show}
										onClick={() => {
											setSeasonStatus({ review: document.getElementById("reviewInput").value }, show_id, show.season_number);
										}}>
										Сохранить
									</button>
								</LoadingOverlay>
							</div>
						</div>
					</div>
					<div className='contentBody'>
						<div>
							<h3>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: show.overview }} />
						</div>
						<div className='showSeasonsBody'>
							<h3 style={{ paddingTop: "15px" }}>Список серий</h3>
							<details open={false} className='episodeRows' style={{ marginBottom: "15px" }}>
								<summary>Развернуть</summary>
								<div style={{ marginLeft: "5px" }} hidden={!loggedIn || !userInfo?.user_watched_show}>
									Выбрать все&nbsp;
									<input
										type='checkbox'
										checked={isChecked > 0}
										onChange={(res) => {
											setSaveEpisodes(true);
											setIsChecked(res.target.checked ? 1 : -1);
										}}
									/>
								</div>
								<ul>
									{show.episodes
										? show.episodes.map((episode, counter) => (
												<li className='episode' key={counter}>
													<DetailedEpisodeRow
														episode={episode}
														showID={show_id}
														loggedIn={loggedIn}
														userInfo={getEpisodeByID(userInfo.episodes, episode.id)}
														setEpisodeUserStatus={setEpisodesStatus}
														checkAll={isChecked}
														userWatchedShow={userInfo?.user_watched_show}
														setSaveEpisodes={setSaveEpisodes}
													/>
												</li>
										  ))
										: ""}
								</ul>
							</details>
							<div hidden={!(chartData.length > 0)}>
								{document.body.clientHeight < document.body.clientWidth ? (
									<ResponsiveContainer width='100%' height={200}>
										<AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
											<defs>
												<linearGradient id='colorUv' x1='0' y1='0' x2='0' y2='1'>
													<stop offset='5%' stopColor='#8884d8' stopOpacity={0.8} />
													<stop offset='95%' stopColor='#8884d8' stopOpacity={0} />
												</linearGradient>
											</defs>
											<XAxis dataKey='name' interval={0} tick={{ fill: "rgb(238, 238, 238)" }} />
											<YAxis tickLine={false} domain={[0, 10]} tick={{ fill: "rgb(238, 238, 238)" }} tickCount={2} />
											<Tooltip contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }} />
											<Area type='monotone' dataKey='Оценка' stroke='#8884d8' fillOpacity={1} fill='url(#colorUv)' />
										</AreaChart>
									</ResponsiveContainer>
								) : (
									<ResponsiveContainer width='100%' height={chartData.length * 30}>
										<AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout='vertical'>
											<defs>
												<linearGradient id='colorUv' x1='0' y1='0' x2='0' y2='1'>
													<stop offset='5%' stopColor='#8884d8' stopOpacity={0.8} />
													<stop offset='95%' stopColor='#8884d8' stopOpacity={0} />
												</linearGradient>
											</defs>
											<YAxis dataKey='name' interval={0} tick={{ fill: "rgb(238, 238, 238)" }} type='category' />
											<XAxis tickLine={false} domain={[0, 10]} tick={{ fill: "rgb(238, 238, 238)" }} tickCount={2} type='number' />
											<Tooltip contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }} />
											<Area type='monotone' dataKey='Оценка' stroke='#8884d8' fillOpacity={1} fill='url(#colorUv)' />
										</AreaChart>
									</ResponsiveContainer>
								)}
							</div>
						</div>
						<div className='friendsBlock' hidden={friendsInfo.length < 1}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
			<div className='saveEpisodesHeader' hidden={!saveEpisodesBlockIsOpen}>
				<button
					className='saveEpisodesButton'
					onClick={() => {
						sendEpisodes();
					}}>
					Сохранить
				</button>
			</div>
		</div>
	);
});

export default SeasonPage;
