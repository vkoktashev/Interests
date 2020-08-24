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
import LoadingOverlay from 'react-loading-overlay';
import SearchCardGame from './SearchCardGame';

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';


/**
 * Основная страница приложения
 */
function SearchPage ( { loggedIn, openLoginForm, searchIsLoading, searchGame, games } ) {
    let history = useHistory();
    let { query } = useParams();
    const [gamesCards, setGamesCards] = useState("");

    useEffect(
		() => {
            searchGame(query, 1);
		},
		[query]
    );

    useEffect(
		() => {
            setGamesCards(<div className="searchCardsGroup">{games.map(game => <SearchCardGame game={game} key={game.id}/>)}</div>);
		},
		[games]
    );
    
    return (
			<div className="bg searchBG"> 
                <LoadingOverlay
                    active={searchIsLoading}
                    spinner
                    text='Ищем ваше говно...'
                    >
                <MDBContainer>
                    <MDBRow>
                        <MDBCol md="0.5"></MDBCol>
                        <MDBCol className="searchPage"> 
                            <h1>Поиск</h1>
                            <MDBFormInline className="md-form"
                                onSubmit={ (event) => {event.preventDefault(); history.push('/search/' + document.getElementById('searchInput2').value); return false; }}>
                                <MDBIcon icon="search" />
                                <input className="form-control form-control-sm ml-3 w-50" type="text" placeholder="Найти" aria-label="Search" id="searchInput2"/>
                            </MDBFormInline>

                            <h1>Результаты поиска</h1>
                                <h3>Игры</h3>
                                <hr style={{ color: '#6C0AAB', backgroundColor: '#6C0AAB', height: 2.5,  borderColor : '#6C0AAB' }}/>
                                {gamesCards}

                                <h3>Фильмы</h3>
                                <hr style={{ color: '#6C0AAB', backgroundColor: '#6C0AAB', height: 2.5,  borderColor : '#6C0AAB' }}/>
                                {gamesCards}

                                <h3>Сериалы</h3>
                                <hr style={{ color: '#6C0AAB', backgroundColor: '#6C0AAB', height: 2.5,  borderColor : '#6C0AAB' }}/>
                                {gamesCards}
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
    searchIsLoading: selectors.getIsLoadingSearchGames(state),
    games: selectors.getSearchContentGames(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        searchGame: (query, page) => {
            dispatch(actions.searchGames(query, page));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchPage);
