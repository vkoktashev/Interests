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

import Rating from "react-rating";
import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';
import StatusButtonGroup from "./StatusButtonGroup";


/**
 * Основная страница приложения
 */
function MoviePage ( {requestMovie, movie, loggedIn, movieIsLoading
    } ) {
    let { id } = useParams();

    useEffect(
		() => {
            requestMovie(id);
        },
        // eslint-disable-next-line
		[id, requestMovie, loggedIn]
    );

    useEffect(
		() => {
            
		},
		[movie]
    );
    
    return (
            <div>
			<div className="bg" style={{backgroundImage: `url(${ 'http://image.tmdb.org/t/p/w1920_and_h800_multi_faces' + movie.tmdb.backdrop_path})`}}/>
                <LoadingOverlay
                    active={movieIsLoading}
                    spinner
                    text='Загрузка...'
                    >
                <MDBContainer>
                    <MDBRow>
                        <MDBCol md="0.5"></MDBCol>
                        <MDBCol className="gameContentPage"> 
                            <MDBContainer>
                                <MDBRow className="gameContentHeader rounded-top" >
                                    <MDBCol size="5">
                                        <img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + movie.tmdb.poster_path} className="img-fluid" alt=""/>
                                    </MDBCol>
                                    <MDBCol size="6">
                                        <h1>{movie.tmdb.title}</h1>
                                        <p style={{marginBottom: "2px"}}>Дата релиза: {movie.tmdb.release_date}</p>
                                        
                                        <br/>
                                        
                                    </MDBCol>
                                </MDBRow> 
                                <MDBRow className="gameContentBody"> 
                                    <MDBCol >
                                        <h3 style={{paddingTop: "15px"}}>Описание</h3>
                                        <div dangerouslySetInnerHTML={{__html: movie.tmdb.overview}} />
                                    </MDBCol>
                                </MDBRow>
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
    requestError: selectors.getGameRequestError(state),
    movie: selectors.getContentMovie(state),
    movieIsLoading: selectors.getIsLoadingContentMovie(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestMovie: (id) => {
            dispatch(actions.requestMovie(id));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(MoviePage);
