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
//import FriendsActivity from "../Common/FriendsActivity";
import SeasonsBlock from "./SeasonsBlock";

/**
 * Основная страница приложения
 */
function ShowPage ( {requestShowSeason, showSeason, showSeasonIsLoading, setShowUserStatus,
                    loggedIn, openLoginForm
    } ) {
    let { show_id, number } = useParams();
    const [date, setDate] = useState("");
    const [review, setReview] = useState("");

    useEffect(
		() => {
            requestShowSeason(show_id, number);
        },
        // eslint-disable-next-line
		[id, requestShowSeason]
    );

    useEffect(
		() => {

            if (showSeason.tmdb.air_date){
                let mas = showSeason.tmdb.air_date.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setDate(newDate);
            }else
                setFDate("");

            if (show.user_info){
                setReview(show.user_info.review);
            }

            document.title = showSeason.tmdb.name;
		},
		[showSeason]
    );
    
    return (
            <div>
			<div className="bg" style={{backgroundImage: `url(${ 'http://image.tmdb.org/t/p/w1920_and_h800_multi_faces' + showSeason.tmdb.backdrop_path})`}}/>
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
                                        <p style={{marginBottom: "2px"}} hidden={date===''}>Дата выхода: {date}</p>
                                        <p style={{marginBottom: "2px"}}>Количество серий: {show.tmdb.number_of_episodes}</p>
                                        <br/>
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
    showSeasonIsLoading: selectors.getIsLoadingContentShow(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShowSeason: (showID, seasonNumber) => {
            dispatch(actions.requestShowSeason(showID, seasonNumber));
        },
        setShowUserStatus: (status) => {
            dispatch(actions.setShowStatus(status));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowPage);
