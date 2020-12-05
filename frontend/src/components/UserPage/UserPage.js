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

/**
 * Основная страница приложения
 */
function UserPage ( { userIsLoading, getUserInfo, userInfo, currentUserInfo, setUserStatus, getUserLogs, userLogs}) 
{ 
    let { userID } = useParams();
    const [activeCategory, setActiveCategory] = useState("");

    useEffect(
		() => {
            getUserInfo(userID);
            getUserLogs(userID, 1, 10);
		},
		[userID, getUserInfo, getUserLogs]
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
                        <button 
                            hidden={currentUserInfo.username === userInfo.username}
                            className='addFriendButton'
                            onClick={ () => {
                                setUserStatus({is_following: userInfo.is_followed?false:true}, userInfo.id);
                            }}>
                            {userInfo.is_followed?'Отписаться':'Подписаться'}
                        </button>
                        <CategoriesTab
                            categories={['Игры', 'Фильмы', 'Друзья']}
                            activeColor='#4527a0' 
                            onChangeCategory={(category) => {
                                if (category === 'Игры')
                                    setActiveCategory(<GameBlock games={userInfo.games} stats={userInfo.stats} />);
                                if (category === 'Фильмы')
                                    setActiveCategory(<MovieBlock movies={userInfo.movies} stats={userInfo.stats} />);
                                if (category === 'Друзья')
                                    setActiveCategory(<FriendBlock users={userInfo.followed_users} />);
                            }}/>
                        {activeCategory}
                        <h4>Последние действия: </h4>
                        <UserLogBlock logs={userLogs} onChangePage={(pageNumber) => getUserLogs(userID, pageNumber, 10)}/>
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
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(UserPage);