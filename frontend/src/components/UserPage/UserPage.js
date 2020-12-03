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
    MDBContainer
} from "mdbreact";

import { connect } from 'react-redux'; 
import * as selectors from '../../store/reducers';
import * as actions from '../../store/actions';

import LoadingOverlay from 'react-loading-overlay';
import GameBlock from './GameBlock';
import MovieBlock from './MovieBlock';
import CategoriesTab from '../Common/CategoriesTab';

/**
 * Основная страница приложения
 */
function UserPage ( { userIsLoading, getUserInfo, userInfo }) 
{ 
    let history = useHistory();
    let { username } = useParams();
    const [activeCategory, setActiveCategory] = useState("");

    useEffect(
		() => {
            getUserInfo(username);
		},
		[username]
    );

    useEffect(
		() => {
            setActiveCategory(<GameBlock games={userInfo.games} stats={userInfo.stats} />);
            document.title = 'Профиль ' + userInfo.username;
		},
		[userInfo]
    );

    return (
        <div>
            <div className="bg searchBG"/> 
            <LoadingOverlay
                active={userIsLoading}
                spinner
                text='Загрузка...'
                >
            <MDBContainer>
                <MDBRow>
                    <MDBCol md="0.5"></MDBCol>
                    <MDBCol className="searchPage"> 
                        <h1>Информация о пользователе {userInfo.username}</h1>
                        <CategoriesTab
                            categories={['Игры', 'Фильмы']}
                            activeColor='#4527a0' 
                            onChangeCategory={(category) => {
                                if (category === 'Игры')
                                    setActiveCategory(<GameBlock games={userInfo.games} stats={userInfo.stats} />);
                                if (category === 'Фильмы')
                                    setActiveCategory(<MovieBlock movies={userInfo.movies} stats={userInfo.stats} />);
                            }}/>
                        {activeCategory}
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
    userIsLoading: selectors.getIsLoadingUserPageContent(state),
    userInfo: selectors.getUserPageContent(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        getUserInfo: (user_id) => {
            dispatch(actions.requestUserPageContent(user_id));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(UserPage);