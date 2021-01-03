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
import {
    PieChart, Pie, Legend, Cell
  } from 'recharts';
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
import ShowBlock from "./ShowBlock";

const LOG_ROWS_COUNT = 15; 

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

/**
 * Основная страница приложения
 */
function UserPage ( { loggedIn, userInfo, 
                    userIsLoading, getUserInfo, currentUserInfo, setUserStatus, 
                    getUserLogs, userLogs, userLogsIsLoading,
                    getUserFriendsLogs, userFriendsLogs, userFriendsLogsIsLoading}) 
{ 
    let { userID } = useParams();
    const [activeCategory, setActiveCategory] = useState("Профиль");
    const [chartData, setChartData] = useState([]);

    useEffect(
		() => {
            getUserInfo(userID);
            getUserLogs(userID, 1, LOG_ROWS_COUNT);
        },
        // eslint-disable-next-line
		[userID, getUserInfo, getUserLogs, getUserFriendsLogs]
    );

    useEffect(
		() => {
            if (loggedIn)
                getUserFriendsLogs(userID, 1, LOG_ROWS_COUNT);
        },
        // eslint-disable-next-line
		[loggedIn]
    );

    useEffect(
		() => {
            setChartData([]);
            document.title = 'Профиль ' + userInfo.username;
            if (userInfo.stats.games){
                let newData = [];
                if (userInfo.stats.games.total_spent_time > 0)
                    newData.push({name: 'Часов в играх', value: userInfo.stats.games.total_spent_time});
                if (userInfo.stats.movies.total_spent_time > 0)
                    newData.push({name: 'Часов в фильмах', value: userInfo.stats.movies.total_spent_time});
                if (userInfo.stats.episodes.total_spent_time > 0)
                    newData.push({name: 'Часов в сериалах', value: userInfo.stats.episodes.total_spent_time});
                setChartData(newData);
            }
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
                    <MDBCol className="userPage"> 
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
                            categories={['Профиль', 'Игры', 'Фильмы', 'Сериалы', 'Друзья']}
                            activeColor='#7654de' 
                            onChangeCategory={(category) => { setActiveCategory(category) }}/>

                            <div hidden={activeCategory!=='Профиль'}>
                                <h4>Моя активность: </h4>
                                <LoadingOverlay
                                    active={userLogsIsLoading}
                                    spinner
                                    text='Загрузка активности...'
                                    >

                                    <div hidden={chartData.length < 1}>
                                        <PieChart width={300} height={220} hidden={chartData.length < 1}>
                                            <Pie dataKey="value" 
                                                data={chartData} 
                                                cx="50%" cy="50%"
                                                outerRadius={80} 
                                                fill="#8884d8" 
                                                labelLine={true}
                                                label
                                                >
                                            {
                                                chartData.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]} key={index}/>)
                                            }
                                            </Pie>
                                            <Legend verticalAlign="bottom" horizontalAlign="center"/>
                                        </PieChart>
                                    </div>

                                    <UserLogBlock logs={userLogs} onChangePage={(pageNumber) => getUserLogs(userID, pageNumber, LOG_ROWS_COUNT)}/>
                                </LoadingOverlay>
                            </div>
                            <div hidden={activeCategory!=='Игры'}>
                                <GameBlock games={userInfo.games} stats={userInfo.stats} />
                            </div>
                            <div hidden={activeCategory!=='Фильмы'}>
                                <MovieBlock movies={userInfo.movies} stats={userInfo.stats} />
                            </div>
                            <div hidden={activeCategory!=='Сериалы'}>
                                <ShowBlock shows={userInfo.shows} stats={userInfo.stats} />
                            </div>
                            <div hidden={activeCategory!=='Друзья'}>
                                <FriendBlock users={userInfo.followed_users?userInfo.followed_users:[]} />
                                <h4>Активность друзей: </h4>
                                <LoadingOverlay
                                    active={userFriendsLogsIsLoading}
                                    spinner
                                    text='Загрузка активности...'
                                    >
                                    <UserLogBlock logs={userFriendsLogs} onChangePage={(pageNumber) => getUserFriendsLogs(userID, pageNumber, LOG_ROWS_COUNT)} showUsername={true}/>
                                </LoadingOverlay>
                                
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
    userLogsIsLoading: selectors.getIsLoadingUserPageLogs(state),
    userFriendsLogs: selectors.getUserPageFriendsLogs(state),
    userFriendsLogsIsLoading: selectors.getIsLoadingUserPageFriendsLogs(state),
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
