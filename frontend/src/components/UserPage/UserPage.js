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
    MDBContainer
} from "mdbreact";
import './style.css';

import { connect } from 'react-redux'; 
import * as selectors from '../../store/reducers';
import * as actions from '../../store/actions';

import LoadingOverlay from 'react-loading-overlay';
import GameBlock from './GameBlock';
import FriendBlock from './FriendBlock';
import MovieBlock from './MovieBlock';
import UserLogBlock from './UserLogBlock';
import CategoriesTab from '../Common/CategoriesTab';

const LOG_ROWS_COUNT = 15; 

/**
 * Основная страница приложения
 */
function UserPage ( { userIsLoading, getUserInfo, userInfo, currentUserInfo, setUserStatus, getUserLogs, userLogs, getUserFriendsLogs, userFriendsLogs}) 
{ 
    let { userID } = useParams();
    const [activeCategory, setActiveCategory] = useState("Профиль");

    useEffect(
		() => {
            getUserInfo(userID);
            getUserLogs(userID, 1, LOG_ROWS_COUNT);
            getUserFriendsLogs(userID, 1, LOG_ROWS_COUNT);
		},
		[userID, getUserInfo, getUserLogs, getUserFriendsLogs]
    );

    useEffect(
		() => {
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
                        <button 
                            hidden={currentUserInfo.username === userInfo.username}
                            className='addFriendButton'
                            onClick={ () => {
                                setUserStatus({is_following: userInfo.is_followed?false:true}, userInfo.id);
                            }}>
                            {userInfo.is_followed?'Отписаться':'Подписаться'}
                        </button>
                        <CategoriesTab
                            categories={['Профиль', 'Игры', 'Фильмы', 'Друзья']}
                            activeColor='#4527a0' 
                            onChangeCategory={(category) => { setActiveCategory(category) }}/>

                            <div hidden={activeCategory!=='Профиль'}>
                                <h4>Моя активность: </h4>
                                <UserLogBlock logs={userLogs} onChangePage={(pageNumber) => getUserLogs(userID, pageNumber, LOG_ROWS_COUNT)}/>
                            </div>
                            <div hidden={activeCategory!=='Игры'}>
                                <GameBlock games={userInfo.games} stats={userInfo.stats} />
                            </div>
                            <div hidden={activeCategory!=='Фильмы'}>
                                <MovieBlock movies={userInfo.movies} stats={userInfo.stats} />
                            </div>
                            <div hidden={activeCategory!=='Друзья'}>
                                <FriendBlock users={userInfo.followed_users?userInfo.followed_users:[]} />
                                <h4>Активность друзей: </h4>
                                <UserLogBlock logs={userFriendsLogs} onChangePage={(pageNumber) => getUserFriendsLogs(userID, pageNumber, LOG_ROWS_COUNT)} showUsername={true}/>
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
    userIsLoading: selectors.getIsLoadingUserPageContent(state),
    userInfo: selectors.getUserPageContent(state),
    userLogs: selectors.getUserPageLogs(state),
    userFriendsLogs: selectors.getUserPageFriendsLogs(state),
    currentUserInfo: selectors.getUser(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        getUserInfo: (user_id) => {
            dispatch(actions.requestUserPageContent(user_id));
        },
        setUserStatus: (is_following, userID) => {
            dispatch(actions.setUserStatus(is_following, userID));
        },
        getUserLogs: (userID, page, resultsOnPage) => {
            dispatch(actions.requestUserPageLogs(userID, page, resultsOnPage));
        },
        getUserFriendsLogs: (userID, page, resultsOnPage) => {
            dispatch(actions.requestUserPageFriendsLogs(userID, page, resultsOnPage));
        },
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(UserPage);