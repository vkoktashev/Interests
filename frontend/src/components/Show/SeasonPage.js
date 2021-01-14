import React, {
    useEffect,
    useState
} from "react";
import { useHistory } from "react-router-dom";
import {
    useParams
} from "react-router-dom";
import {
    MDBRow,
    MDBCol,
    MDBContainer,
    MDBIcon,
    MDBInput
} from "mdbreact";
import LoadingOverlay from 'react-loading-overlay';
import {
    AreaChart , linearGradient, XAxis, Tooltip, YAxis, Area  
  } from 'recharts';
import './style.css';

import Rating from "react-rating";
import { connect } from 'react-redux'; 
import * as selectors from '../../store/reducers';
import * as actions from '../../store/actions';
import FriendsActivity from "../Common/FriendsActivity";
import DetailedEpisodeRow from "./DetailedEpisodeRow";

/**
 * Основная страница приложения
 */
function ShowPage ( {requestShowSeason, showSeason, showSeasonIsLoading, setShowUserStatus, 
                    setShowEpisodeUserStatus,
                    requestShowSeasonUserInfo, showUserInfo, showUserInfoIsLoading,
                    loggedIn, openLoginForm
    } ) {
    let history = useHistory();
    let { show_id, number } = useParams();
    const [date, setDate] = useState("");
    const [review, setReview] = useState("");
    const [userRate, setUserRate] = useState(0);
    const [chartData, setChartData] = useState([]);

    useEffect(
		() => {
            setClear();
            setReview('');
            setUserRate(0);
            requestShowSeason(show_id, number);
        },
        // eslint-disable-next-line
		[show_id, number, requestShowSeason]
    );

    useEffect(
		() => {
            if (loggedIn)
                requestShowSeasonUserInfo(show_id, number);
            else{
                setReview('');
                setUserRate(0);
            }
        },
        // eslint-disable-next-line
		[loggedIn, show_id, number]
    );

    useEffect(
		() => {
            setClear();
            if (showSeason.tmdb.air_date){
                let mas = showSeason.tmdb.air_date.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setDate(newDate);
            }
                
            document.title = showSeason.tmdb.show_name + ' - ' + showSeason.tmdb.name;
		},
		[showSeason]
    );
    
    useEffect(
		() => {
            setChartData([]);
            if (showSeason.tmdb.episodes)
            if (showSeason.tmdb.episodes.length > 0){
                let newData = [];
                for (let episode in showSeason.tmdb.episodes){
                    if (showSeason.tmdb.episodes[episode].vote_average > 0)
                        newData.push({ "name": 'Ep ' + showSeason.tmdb.episodes[episode].episode_number,  "Оценка": showSeason.tmdb.episodes[episode].vote_average });
                }
                setChartData(newData);
            }
		},
		[showSeason]
    );

    useEffect(
		() => {
            if (showUserInfo?.review)
                setReview(showUserInfo.review);
            else
                setReview('');

            if (showUserInfo?.score)
                setUserRate(showUserInfo.score);
            else
                setUserRate(0);
        },
        // eslint-disable-next-line
		[showUserInfo]
    );
    
    function setClear(){
        setDate("");
    }

    function getEpisodeByNumber(episodes, number){
        for (let episode in episodes)
            if (episodes[episode].episode_number === number)
                return episodes[episode];
    }

    return (
            <div>
			<div className="bg" style={{backgroundImage: `url(${ 'http://image.tmdb.org/t/p/w1920_and_h800_multi_faces' + showSeason.tmdb.backdrop_path})`}}/>
                <LoadingOverlay
                    active={showSeasonIsLoading}
                    spinner
                    text='Загрузка...'
                    >
                <MDBContainer>
                    <MDBRow>
                        <MDBCol md="0.5"></MDBCol>
                        <MDBCol className="showContentPage"> 
                            <MDBContainer>
                                <MDBRow className="showContentHeader rounded-top" >
                                    <MDBCol size="3" className="posterBlock">
                                        <img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + showSeason.tmdb.poster_path} className="img-fluid" alt=""/>
                                    </MDBCol>
                                    <MDBCol size="9">
                                        <h1>
                                            <a href={window.location.origin + '/show/' + show_id} 
                                                onClick={(e) => { history.push('/show/' + show_id ); e.preventDefault();}}
                                                >
                                                {showSeason.tmdb.show_name}
                                            </a>  
                                            { ' - ' + showSeason.tmdb.name}
                                        </h1>
                                        <h5 style={{marginBottom: "10px", marginTop: "-10px"}}>{showSeason.tmdb.show_original_name + ' - Season ' + showSeason.tmdb.season_number}</h5>
                                        <div className="mainInfo">
                                            <p hidden={date===''}>Дата выхода: {date}</p>
                                            <p>Количество серий: {showSeason.tmdb.episodes?showSeason.tmdb.episodes.length:0}</p>
                                        </div>
                                        <div hidden={!loggedIn | (!showUserInfo?.user_watched_show)}>
                                        <LoadingOverlay active={showUserInfoIsLoading} spinner text='Загрузка...'>
                                            <Rating stop={10}
                                                emptySymbol={<MDBIcon far icon="star" size="1x" style={{fontSize: "25px"}}/>}
                                                fullSymbol={[1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x" style={{fontSize: "25px"}} title={n}/>)}
                                                initialRating={userRate}
                                                onChange={(score) => {
                                                    if (!loggedIn){
                                                        openLoginForm();
                                                    }else{
                                                        setUserRate(score);
                                                        setShowUserStatus({score: score }, show_id, showSeason.tmdb.season_number);
                                                    }}
                                                }
                                            />
                                            <MDBInput 
                                                type="textarea" 
                                                id="reviewSeasonInput"
                                                label="Ваш отзыв" 
                                                value={review}
                                                onChange={(event) =>setReview(event.target.value)}
                                                outline
                                            />
                                            <button 
                                                className={'savePreviewButton'} 
                                                hidden={!loggedIn | (!showUserInfo?.user_watched_show)}
                                                onClick={() => {
                                                        if (!loggedIn){
                                                            openLoginForm();
                                                        }else{
                                                            setShowUserStatus({ review: document.getElementById('reviewSeasonInput').value }, show_id, showSeason.tmdb.season_number);
                                                        }
                                                    }
                                                }
                                                >
                                                Сохранить
                                            </button>
                                        </LoadingOverlay>
                                        </div>
                                    </MDBCol>
                                </MDBRow> 
                                <MDBRow className="showContentBody"> 
                                    <MDBCol >
                                        <h3 style={{paddingTop: "15px"}}>Описание</h3>
                                        <div dangerouslySetInnerHTML={{__html: showSeason.tmdb.overview}} />
                                    </MDBCol>
                                </MDBRow>
                                <div className="showContentBody"> 
                                    <h3 style={{paddingTop: "15px"}}>Список серий</h3>
                                    <details open={false} className='episodeRows'>
                                        <summary>Развернуть</summary>
                                            <ul>
                                                {  showSeason.tmdb.episodes?showSeason.tmdb.episodes.map((episode) => 
                                                    <li className="episode" key={showSeason.tmdb.id+episode.episode_number}>
                                                        <DetailedEpisodeRow episode={episode} 
                                                            showID={show_id} 
                                                            loggedIn={loggedIn} 
                                                            userInfo={getEpisodeByNumber(showUserInfo.episodes, episode.episode_number)} 
                                                            setShowEpisodeUserStatus={setShowEpisodeUserStatus}
                                                            userWatchedShow={showUserInfo?.user_watched_show}
                                                        />
                                                    </li>):'' }
                                            </ul>
                                    </details>
                                    <div hidden={!(chartData.length > 0)}>
                                        <AreaChart width={700} height={250} data={chartData}
                                            margin={{ top: 20, right: 20, left: 15, bottom: 0 }}
                                            >
                                            <defs>
                                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" interval={0} tick={{ fill: "rgb(238, 238, 238)"}}/>
                                            <YAxis tickLine={false} domain={[0, 10]} tick={{ fill: "rgb(238, 238, 238)"}} tickCount={2}/>
                                            <Tooltip contentStyle={{color: 'rgb(238, 238, 238)', backgroundColor: 'rgb(30, 30, 30)'}}/>
                                            <Area type="monotone" dataKey="Оценка" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                                        </AreaChart>
                                    </div>
                                </div>
                            </MDBContainer>
                            <div className="movieFriendsBlock" hidden={showUserInfo.friends_info.length < 1}>
                                <h4>Отзывы друзей</h4>
                                <FriendsActivity info={showUserInfo.friends_info}/>
                            </div>
                        </MDBCol>
                        <MDBCol md="0.5"></MDBCol>
                    </MDBRow>
                 </MDBContainer>
                 </LoadingOverlay>
			</div>
    	);
}

const mapStateToProps = state => ({
    loggedIn: selectors.getLoggedIn(state),
    requestError: selectors.getShowRequestError(state),
    showSeason: selectors.getContentShow(state),
    showSeasonIsLoading: selectors.getIsLoadingContentShow(state),
    showUserInfo: selectors.getContentShowUserInfo(state),
    showUserInfoIsLoading: selectors.getIsLoadingContentShowUserInfo(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShowSeason: (showID, seasonNumber) => {
            dispatch(actions.requestShowSeason(showID, seasonNumber));
        },
        setShowUserStatus: (status, showID, seasonNumber) => {
            dispatch(actions.setShowSeasonStatus(status, showID, seasonNumber));
        },
        setShowEpisodeUserStatus: (status, showID) => {
            dispatch(actions.setShowEpisodesStatus(status, showID));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        requestShowSeasonUserInfo: (showID, seasonID) => {
            dispatch(actions.requestShowSeasonUserInfo(showID, seasonID));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowPage);
