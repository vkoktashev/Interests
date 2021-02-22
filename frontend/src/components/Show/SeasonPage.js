import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import ShowStore from "../../store/ShowStore";
import PagesStore from "../../store/PagesStore";

import { MDBIcon, MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import { AreaChart, linearGradient, XAxis, Tooltip, YAxis, Area, ResponsiveContainer } from "recharts";
import "./style.css";

import Rating from "react-rating";
import FriendsActivity from "../Common/FriendsActivity";
import DetailedEpisodeRow from "./DetailedEpisodeRow";

/**
 * Основная страница приложения
 */
const ShowPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { requestShowSeason, show, showIsLoading, setShowSeasonStatus, setShowEpisodesStatus, requestShowSeasonUserInfo, userInfo, userInfoIsLoading } = ShowStore;
	const { openLoginForm } = PagesStore;

	let history = useHistory();
	let { show_id, number } = useParams();
	const [date, setDate] = useState("");
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(0);
	const [chartData, setChartData] = useState([]);

	useEffect(
		() => {
			setClear();
			setReview("");
			setUserRate(0);
			requestShowSeason(show_id, number);
		},
		// eslint-disable-next-line
		[show_id, number, requestShowSeason]
	);

	useEffect(
		() => {
			if (loggedIn) requestShowSeasonUserInfo(show_id, number);
			else {
				setReview("");
				setUserRate(0);
			}
		},
		// eslint-disable-next-line
		[loggedIn, show_id, number]
	);

	useEffect(() => {
		setClear();
		if (show.tmdb.air_date) {
			let mas = show.tmdb.air_date.split("-");
			let newDate = mas[2] + "." + mas[1] + "." + mas[0];
			setDate(newDate);
		}

		document.title = show.tmdb.show_name + " - " + show.tmdb.name;
	}, [show]);

	useEffect(() => {
		setChartData([]);
		if (show.tmdb.episodes)
			if (show.tmdb.episodes.length > 0) {
				let newData = [];
				for (let episode in show.tmdb.episodes) {
					if (show.tmdb.episodes[episode].vote_average > 0) newData.push({ name: "Ep " + show.tmdb.episodes[episode].episode_number, Оценка: show.tmdb.episodes[episode].vote_average });
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

	function setClear() {
		setDate("");
	}

	function getEpisodeByNumber(episodes, number) {
		for (let episode in episodes) if (episodes[episode].episode_number === number) return episodes[episode];
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${"http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + show.tmdb.backdrop_path})` }} />
			<LoadingOverlay active={showIsLoading} spinner text='Загрузка...'>
				<div className='showContentPage'>
					<div className='showContentHeader'>
						<div className='showPosterBlock'>
							<img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb.poster_path} className='img-fluid' alt='' />
						</div>
						<div className='showInfoBlock'>
							<h1 className='header'>
								<a
									href={window.location.origin + "/show/" + show_id}
									onClick={(e) => {
										history.push("/show/" + show_id);
										e.preventDefault();
									}}>
									{show.tmdb.show_name}
								</a>
								{" - " + show.tmdb.name}
							</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{show.tmdb.show_original_name + " - Season " + show.tmdb.season_number}</h5>
							<div className='mainInfo'>
								<p hidden={date === ""}>Дата выхода: {date}</p>
								<p>Количество серий: {show.tmdb.episodes ? show.tmdb.episodes.length : 0}</p>
							</div>
							<div hidden={!loggedIn | !userInfo?.user_watched_show}>
								<LoadingOverlay active={userInfoIsLoading & !showIsLoading} spinner text='Загрузка...'>
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
												setShowSeasonStatus({ score: score }, show_id, show.tmdb.season_number);
											}
										}}
									/>
									<MDBInput type='textarea' id='reviewSeasonInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
									<button
										className={"savePreviewButton"}
										hidden={!loggedIn | !userInfo?.user_watched_show}
										onClick={() => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setShowSeasonStatus({ review: document.getElementById("reviewSeasonInput").value }, show_id, show.tmdb.season_number);
											}
										}}>
										Сохранить
									</button>
								</LoadingOverlay>
							</div>
						</div>
						<div className='showContentBody'>
							<div>
								<h3 style={{ paddingTop: "15px" }}>Описание</h3>
								<div dangerouslySetInnerHTML={{ __html: show.tmdb.overview }} />
							</div>
							<div className='showSeasonsBody'>
								<h3 style={{ paddingTop: "15px" }}>Список серий</h3>
								<details open={false} className='episodeRows' style={{ marginBottom: "15px" }}>
									<summary>Развернуть</summary>
									<ul>
										{show.tmdb.episodes
											? show.tmdb.episodes.map((episode) => (
													<li className='episode' key={show.tmdb.id + episode.episode_number}>
														<DetailedEpisodeRow
															episode={episode}
															showID={show_id}
															loggedIn={loggedIn}
															userInfo={getEpisodeByNumber(userInfo.episodes, episode.episode_number)}
															setShowEpisodeUserStatus={setShowEpisodesStatus}
															userWatchedShow={userInfo?.user_watched_show}
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
							<div className='movieFriendsBlock' hidden={userInfo.friends_info.length < 1}>
								<h4>Отзывы друзей</h4>
								<FriendsActivity info={userInfo.friends_info} />
							</div>
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default ShowPage;
