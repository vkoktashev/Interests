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

/**
 * Основная страница приложения
 */
function ShowPage ( {requestShow, show, showIsLoading,
                    loggedIn, openLoginForm
    } ) {
    let { id } = useParams();
    const [metascoreBlock, setMetascoreBlock] = useState("");
    const [genres, setGenres] = useState("");
    const [companies, setCompanies] = useState("");
    //const [review, setReview] = useState("");

    useEffect(
		() => {
            requestShow(id);
        },
        // eslint-disable-next-line
		[id, requestShow]
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

            /*if (show.user_info){
                setReview(movie.user_info.review);
            }*/

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
                                        <p style={{marginBottom: "2px"}}>Дата выхода первой серии: {show.tmdb.first_air_date}</p>
                                        <p style={{marginBottom: "2px"}}>Дата выхода последней серии: {show.tmdb.last_air_date}</p>
                                        <p style={{marginBottom: "2px"}}>Продолжительность (мин): {show.tmdb.episode_run_time[0]}</p>
                                        <p style={{marginBottom: "2px"}}>Жанр: {genres}</p>
                                        <p style={{marginBottom: "2px"}}>Компания: {companies}</p>
                                        <br/>
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
                                <MDBCol size="6" style={{paddingLeft: "10px"}}>
                                    
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
    show: selectors.getContentShow(state),
    showIsLoading: selectors.getIsLoadingContentShow(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShow: (id) => {
            dispatch(actions.requestShow(id));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowPage);
