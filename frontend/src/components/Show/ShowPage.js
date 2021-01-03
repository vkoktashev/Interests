import React, {
    useEffect,
    useState
} from "react";
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
import './style.css';

import Rating from "react-rating";
import { connect } from 'react-redux'; 
import * as selectors from '../../store/reducers';
import * as actions from '../../store/actions';
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import SeasonsBlock from "./SeasonsBlock";

/**
 * Основная страница приложения
 */
function ShowPage ( {requestShow, show, showIsLoading, setShowUserStatus,
                    requestShowFriends, showFriends, showFriendsIsLoading,
                    loggedIn, openLoginForm
    } ) {
    let { id } = useParams();
    const [metascoreBlock, setMetascoreBlock] = useState("");
    const [genres, setGenres] = useState("");
    const [companies, setCompanies] = useState("");
    const [showStatus, setShowStatus] = useState("");
    const [firstDate, setFirstDate] = useState("");
    const [lastDate, setLastDate] = useState("");
    const [review, setReview] = useState("");

    useEffect(
		() => {
            requestShow(id);
        },
        // eslint-disable-next-line
		[id, requestShow]
    );

    useEffect(
		() => {
            if (loggedIn)
                requestShowFriends(id, 1);
        },
        // eslint-disable-next-line
		[loggedIn]
    );

    useEffect(
		() => {
            if (show.tmdb.vote_average){
                setMetascoreBlock(
                    <div>
                        <div className="metacritic">
                            <p>{show.tmdb.vote_average * 10}</p>
                        </div>
                        <p className="metacriticText">TMDB score</p>
                    </div>
                );
            }else{
                setMetascoreBlock("");
            }

            if (show.tmdb.genres){
                let newGenres = ""
                for (let i = 0; i < show.tmdb.genres.length; i++){
                    newGenres += show.tmdb.genres[i].name;
                    if (i !== show.tmdb.genres.length - 1)
                        newGenres += ", ";
                }
                setGenres(newGenres);   
            }

            if (show.tmdb.production_companies){
                let newCompanies = ""
                for (let i = 0; i < show.tmdb.production_companies.length; i++){
                    newCompanies += show.tmdb.production_companies[i].name;
                    if (i !== show.tmdb.production_companies.length - 1)
                        newCompanies += ", ";
                }
                setCompanies(newCompanies);   
            }

            
            switch (show.tmdb.status){
                case 'Ended':
                    setShowStatus('Окончен');break;
                case 'Returning Series':
                    setShowStatus('Продолжается');break;
                case 'Pilot':
                    setShowStatus('Пилот');break;
                case 'Canceled':
                    setShowStatus('Отменен');break;
                case 'In Production':
                    setShowStatus('В производстве');break;
                case 'Planned':
                    setShowStatus('Запланирован');break;
                default:
                    setShowStatus(show.tmdb.status);
            } 

            if (show.tmdb.first_air_date){
                let mas = show.tmdb.first_air_date.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setFirstDate(newDate);
            }else
                setFirstDate("");

            if (show.tmdb.last_air_date){
                let mas = show.tmdb.last_air_date.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setLastDate(newDate);
            }else
                setLastDate("");

            if (show.user_info){
                setReview(show.user_info.review);
            }

            document.title = show.tmdb.name;
		},
		[show]
    );
    
    return (
            <div>
			<div className="bg" style={{backgroundImage: `url(${ 'http://image.tmdb.org/t/p/w1920_and_h800_multi_faces' + show.tmdb.backdrop_path})`}}/>
                <LoadingOverlay
                    active={showIsLoading}
                    spinner
                    text='Загрузка...'
                    >
                <MDBContainer>
                    <MDBRow>
                        <MDBCol md="0.5"></MDBCol>
                        <MDBCol className="showContentPage"> 
                            <MDBContainer>
                                <MDBRow className="showContentHeader rounded-top" >
                                    <MDBCol size="5" className="posterBlock">
                                        <img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb.poster_path} className="img-fluid" alt=""/>
                                    </MDBCol>
                                    <MDBCol size="6">
                                        <h1>{show.tmdb.name}</h1>
                                        <h5 style={{marginBottom: "10px", marginTop: "-10px"}}>{show.tmdb.original_name}</h5>
                                        <div className="mainInfo">
                                            <p>Жанр: {genres}</p>
                                            <p>Компания: {companies}</p>
                                            <p hidden={firstDate===''}>Дата выхода первой серии: {firstDate}</p>
                                            <p hidden={lastDate===''}>Дата выхода последней серии: {lastDate}</p>
                                            <p hidden={show.tmdb.episode_run_time?false:true}>Продолжительность (мин): {show.tmdb.episode_run_time?show.tmdb.episode_run_time[0]:0}</p>
                                            <p>Количество сезонов: {show.tmdb.number_of_seasons}</p>
                                            <p>Количество серий: {show.tmdb.number_of_episodes}</p>
                                            <p>Статус: {showStatus}</p>
                                        </div>
                                        <Rating stop={10}
                                            emptySymbol={<MDBIcon far icon="star" size="1x" style={{fontSize: "25px"}}/>}
                                            fullSymbol={[1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x" style={{fontSize: "25px"}} title={n}/>)}
                                            initialRating={show.user_info?show.user_info.score:0}
                                            readonly={!loggedIn | (!show.user_info)}
                                            onChange={(score) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                    setShowUserStatus({score: score, review: document.getElementById('reviewInput').value });
                                                }}
                                            }
                                        /> <br/>
                                        <StatusButtonGroup loggedIn={loggedIn} 
                                            statuses={['Не смотрел', 'Буду смотреть', 'Смотрю', 'Дропнул', 'Посмотрел']}
                                            activeColor='#4527a0' 
                                            userStatus={show.user_info?show.user_info.status:'Не смотрел'}
                                            onChangeStatus={(status) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                    setShowUserStatus({ status: status, review: document.getElementById('reviewInput').value });
                                                }
                                            }}/>
                                    </MDBCol>
                                    <MDBCol size="1">
                                        { metascoreBlock }
                                    </MDBCol>
                                </MDBRow> 
                                <MDBRow className="showContentBody"> 
                                    <MDBCol >
                                        <h3 style={{paddingTop: "15px"}}>Описание</h3>
                                        <div dangerouslySetInnerHTML={{__html: show.tmdb.overview}} />
                                    </MDBCol>
                                </MDBRow>
                                <div className="showContentBody"> 
                                    <h3 style={{paddingTop: "15px"}}>Список серий</h3>
                                    <SeasonsBlock seasons={show.tmdb.seasons} showID={show.tmdb.id}/>
                                </div>
                                <MDBCol size="6" style={{paddingLeft: "10px"}}>
                                    <h3 style={{paddingTop: "10px"}}>Отзывы</h3>
                                        
                                    <MDBInput 
                                        type="textarea" 
                                        id="reviewInput"
                                        label="Ваш отзыв" 
                                        value={review}
                                        onChange={(event) =>setReview(event.target.value)}
                                        outline
                                    />
                                    <button 
                                        className={'savePreviewButton'} 
                                        disabled={!loggedIn | (!show.user_info)}
                                        onClick={() => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                    setShowUserStatus({ review: document.getElementById('reviewInput').value });
                                                }
                                            }
                                        }
                                        >
                                        Сохранить
                                    </button>
                                </MDBCol>
                            </MDBContainer>
                            <div className="movieFriendsBlock" hidden={showFriends.friends_info.length < 1}>
                                <h4>Отзывы друзей</h4>
                                <FriendsActivity info={showFriends}/>
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
    show: selectors.getContentShow(state),
    showIsLoading: selectors.getIsLoadingContentShow(state),
    showFriends: selectors.getContentShowFriends(state),
    showFriendsIsLoading: selectors.getIsLoadingContentShowFriends(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShow: (id) => {
            dispatch(actions.requestShow(id));
        },
        setShowUserStatus: (status) => {
            dispatch(actions.setShowStatus(status));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        requestShowFriends: (id, page) => {
            dispatch(actions.requestShowFriends(id, page));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowPage);
