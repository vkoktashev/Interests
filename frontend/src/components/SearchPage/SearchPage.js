import React, {
    useEffect,
    useState
} from "react";
import {
    useParams,
    useHistory
} from "react-router-dom";
import {
    MDBRow,
    MDBCol,
    MDBContainer,
    MDBIcon,
    MDBFormInline
} from "mdbreact";
import './style.css';

import LoadingOverlay from 'react-loading-overlay';

import CardGame from './CardGame';
import CardMovie from './CardMovie';
import CardUser from '../Common/CardUser';
import CategoriesTab from '../Common/CategoriesTab';

import { connect } from 'react-redux'; 
import * as selectors from '../../store/reducers';
import * as actions from '../../store/actions';


/**
 * Основная страница приложения
 */
function SearchPage ( { loggedIn, openLoginForm, gamesIsLoading, moviesIsLoading, usersIsLoading, searchGame, games, searchMovie, movies, searchUsers, users } ) {
    let history = useHistory();
    let { query } = useParams();
    const [queryText, setQueryText] = useState("");
    const [gamesCards, setGamesCards] = useState("");
    const [moviesCards, setMoviesCards] = useState("");
    const [usersCards, setUsersCards] = useState("");

    const [activeCategory, setActiveCategory] = useState("Всё");

    useEffect(
		() => {
            searchGame(query, 1);
            searchMovie(query, 1);
            searchUsers(query);
            setQueryText(query);
            document.title = 'Поиск';
		},
		[query, searchGame, searchMovie, searchUsers]
    );

    useEffect(
		() => {
            setGamesCards(<div className="searchCardsGroup">{games.map(game => <CardGame game={game} key={game.id}/>)}</div>);
		},
		[games]
    );

    useEffect(
		() => {
            setMoviesCards(<div className="searchCardsGroup">{movies.map(movie => <CardMovie movie={movie} key={movie.id}/>)}</div>);
		},
		[movies]
    );


    useEffect(
		() => {
            setUsersCards(<div className="searchCardsGroup">{users.map(user => <CardUser user={user} key={user.username}/>)}</div>);
		},
		[users]
    );
    
    return (
            <div>
			<div className="bg searchBG"/> 
                <MDBContainer>
                    <MDBRow>
                        <MDBCol md="0.5"></MDBCol>
                        <MDBCol className="searchPage"> 
                            <h1>Поиск</h1>
                            <MDBFormInline className="md-form"
                                onSubmit={ (event) => {event.preventDefault(); history.push('/search/' + document.getElementById('searchInput2').value); return false; }}>
                                <MDBIcon icon="search" />
                                <input 
                                    className="form-control form-control-sm ml-3 w-50" 
                                    type="text" 
                                    placeholder="Найти" 
                                    aria-label="Search" 
                                    id="searchInput2" 
                                    value={queryText} 
                                    onChange={(event) =>setQueryText(event.target.value)}/>
                            </MDBFormInline>

                            <h1>Результаты поиска</h1>
                                <CategoriesTab
                                    categories={['Всё', 'Игры', 'Фильмы', 'Пользователи']}
                                    activeColor='#4527a0' 
                                    onChangeCategory={(category) => {
                                        setActiveCategory(category);
                                    }}/>

                                <LoadingOverlay
                                    active={gamesIsLoading}
                                    spinner
                                    text='Ищем игры...'
                                    >
                                    <div hidden={activeCategory!=='Всё' && activeCategory!=='Игры'}>
                                        <h3>Игры</h3>
                                        {gamesCards}
                                    </div>
                                </LoadingOverlay>

                                <LoadingOverlay
                                    active={moviesIsLoading}
                                    spinner
                                    text='Ищем фильмы...'
                                    >
                                    <div hidden={activeCategory!=='Всё' && activeCategory!=='Фильмы'}>
                                        <h3>Фильмы</h3>
                                        {moviesCards}
                                    </div>       
                                </LoadingOverlay>
                                
                                <LoadingOverlay
                                    active={usersIsLoading}
                                    spinner
                                    text='Ищем пользователей...'
                                    >
                                    <div hidden={activeCategory!=='Всё' && activeCategory!=='Пользователи'}>
                                        <h3>Пользователи</h3>
                                        {usersCards}
                                    </div>    
                                </LoadingOverlay>
                                
                        </MDBCol>
                        <MDBCol md="0.5"></MDBCol>
                    </MDBRow>
                 </MDBContainer>
			</div>
    	);
}

const mapStateToProps = state => ({
    loggedIn: selectors.getLoggedIn(state),
    gamesIsLoading: selectors.getIsLoadingSearchGames(state),
    moviesIsLoading: selectors.getIsLoadingSearchMovies(state),
    usersIsLoading: selectors.getIsLoadingSearchUsers(state),
    games: selectors.getSearchContentGames(state),
    movies: selectors.getSearchContentMovies(state),
    users: selectors.getSearchContentUsers(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        searchGame: (query, page) => {
            dispatch(actions.searchGames(query, page));
        },
        searchMovie: (query, page) => {
            dispatch(actions.searchMovies(query, page));
        },
        searchUsers: (query) => {
            dispatch(actions.searchUsers(query));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchPage);