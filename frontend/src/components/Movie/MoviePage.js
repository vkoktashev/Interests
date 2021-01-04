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
function MoviePage ( {
        requestMovie, movie, movieIsLoading, setMovieStatus,
        requestMovieFriends, movieFriends, movieFriendsIsLoading,
        loggedIn, openLoginForm, 
    } ) {
    let { id } = useParams();
    const [metascoreBlock, setMetascoreBlock] = useState("");
    const [genres, setGenres] = useState("");
    const [companies, setCompanies] = useState("");
    const [cast, setCast] = useState("");
    const [director, setDirector] = useState("");
    const [review, setReview] = useState("");

    useEffect(
		() => {
            requestMovie(id);
        },
        // eslint-disable-next-line
		[id, requestMovie]
    );

    useEffect(
		() => {
            if (loggedIn)
                requestMovieFriends(id, 1);
        },
        // eslint-disable-next-line
		[loggedIn]
    );

    useEffect(
		() => {
            if (movie.tmdb.vote_average){
                setMetascoreBlock(
                    <div>
                        <div className="metacritic">
                            <p>{movie.tmdb.vote_average * 10}</p>
                        </div>
                        <p className="metacriticText">TMDB score</p>
                    </div>
                );
            }else{
                setMetascoreBlock("");
            }

            if (movie.tmdb.genres){
                let newGenres = ""
                for (let i = 0; i < movie.tmdb.genres.length; i++){
                    newGenres += movie.tmdb.genres[i].name;
                    if (i !== movie.tmdb.genres.length - 1)
                        newGenres += ", ";
                }
                setGenres(newGenres);   
            }

            if (movie.tmdb.production_companies){
                let newCompanies = ""
                for (let i = 0; i < movie.tmdb.production_companies.length; i++){
                    newCompanies += movie.tmdb.production_companies[i].name;
                    if (i !== movie.tmdb.production_companies.length - 1)
                        newCompanies += ", ";
                }
                setCompanies(newCompanies);   
            }

            if (movie.tmdb.cast){
                let newCast = "";
                let length = movie.tmdb.cast.length>5?5:movie.tmdb.cast.length;
                for (let i = 0; i < length; i++){
                    newCast += movie.tmdb.cast[i].name;
                    if (i !== length - 1)
                        newCast += ", ";
                }
                setCast(newCast);   
            }

            if (movie.tmdb.crew){
                let newDirector = ""
                for (let i = 0; i < movie.tmdb.crew.length; i++){
                    if (movie.tmdb.crew[i].job === "Director"){
                        newDirector = movie.tmdb.crew[i].name;
                        break;
                    }
                }
                setDirector(newDirector);   
            }

            if (movie.user_info){
                setReview(movie.user_info.review);
            }else{
                setReview('');
            }

            document.title = movie.tmdb.title;
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
                        <MDBCol className="movieContentPage"> 
                            <MDBContainer>
                                <MDBRow className="movieContentHeader rounded-top" >
                                    <MDBCol size="5" className="posterBlock">
                                        <img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + movie.tmdb.poster_path} className="img-fluid" alt=""/>
                                    </MDBCol>
                                    <MDBCol size="6">
                                        <h1>{movie.tmdb.title}</h1>
                                        <div className="mainInfo">
                                            <p>Дата релиза: {movie.tmdb.release_date}</p>
                                            <p>Продолжительность (мин): {movie.tmdb.runtime}</p>
                                            <p>Жанр: {genres}</p>
                                            <p>Компания: {companies}</p>
                                            <p>Слоган: {movie.tmdb.tagline}</p>
                                            <p>В ролях: {cast}</p>
                                            <p>Режиссер: {director}</p>
                                        </div>
                                        <Rating stop={10}
                                            emptySymbol={<MDBIcon far icon="star" size="1x" style={{fontSize: "25px"}}/>}
                                            fullSymbol={[1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x" style={{fontSize: "25px"}} title={n}/>)}
                                            initialRating={movie.user_info?movie.user_info.score:0}
                                            readonly={!loggedIn | (!movie.user_info)}
                                            onChange={(score) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                    setMovieStatus({score: score });
                                                }}
                                            }
                                        /> <br/>
                                        <StatusButtonGroup loggedIn={loggedIn} 
                                            statuses={['Не смотрел', 'Буду смотреть', 'Дропнул', 'Посмотрел']}
                                            activeColor='#4527a0' 
                                            userStatus={movie.user_info?movie.user_info.status:'Не смотрел'}
                                            onChangeStatus={(status) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                   setMovieStatus({ status: status });
                                                }
                                            }}/>
                                    </MDBCol>
                                    <MDBCol size="1">
                                        { metascoreBlock }
                                    </MDBCol>
                                </MDBRow> 
                                <MDBRow className="movieContentBody"> 
                                    <MDBCol >
                                        <h3 style={{paddingTop: "15px"}}>Описание</h3>
                                        <div dangerouslySetInnerHTML={{__html: movie.tmdb.overview}} />
                                    </MDBCol>
                                </MDBRow>
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
                                            disabled={!loggedIn | (!movie.user_info)}
                                            onClick={() => {
                                                    if (!loggedIn){
                                                        openLoginForm();
                                                    }else{
                                                        setMovieStatus({   review: document.getElementById('reviewInput').value });
                                                    }
                                                }
                                            }
                                            >
                                            Сохранить
                                        </button>
                                    </MDBCol>
                            </MDBContainer>
                            <div className="movieFriendsBlock" hidden={movieFriends.friends_info.length < 1}>
                                <h4>Отзывы друзей</h4>
                                <FriendsActivity info={movieFriends}/>
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
    requestError: selectors.getMovieRequestError(state),
    movie: selectors.getContentMovie(state),
    movieIsLoading: selectors.getIsLoadingContentMovie(state),
    movieFriends: selectors.getContentMovieFriends(state),
    movieFriendsIsLoading: selectors.getIsLoadingContentMovieFriends(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestMovie: (id) => {
            dispatch(actions.requestMovie(id));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        setMovieStatus: (status) => {
            dispatch(actions.setMovieStatus(status));
        },
        requestMovieFriends: (id, page) => {
            dispatch(actions.requestMovieFriends(id, page));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(MoviePage);
