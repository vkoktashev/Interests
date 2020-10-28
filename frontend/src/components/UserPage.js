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
    MDBTable,
    MDBTableHead,
    MDBTableBody
} from "mdbreact";

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

import LoadingOverlay from 'react-loading-overlay';


/**
 * Основная страница приложения
 */
function UserPage ( { userIsLoading, getUserInfo, userInfo }) 
{ 
    let history = useHistory();
    let { username } = useParams();
    const [ gameTableData, setGameTableData] = useState();

    useEffect(
		() => {
            getUserInfo(username);
		},
		[username]
    );

    useEffect(
		() => {
			if (userInfo && userInfo.games)
                setGameTableData(userInfo.games.map((game) => {
					return <tr key={game.game.rawg_id}>
								<td onClick={() => history.push('/game/' + game.game.rawg_slug)} style={{cursor: "pointer"}}>{game.game.rawg_name}</td>
								<td>{game.status}</td>
								<td>{game.score}</td>
								<td>{game.review}</td>
								<td>{game.spent_time}</td>
							</tr>;
				}));
			else
                setGameTableData(null);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
                    <h3>Игры</h3>
                    <hr style={{ color: '#6C0AAB', backgroundColor: '#6C0AAB', height: 2.5,  borderColor : '#6C0AAB' }}/>
                    <MDBTable>
                        <MDBTableHead>
                            <tr>
                                <th>Название</th>
                                <th>Статус</th>
                                <th>Оценка</th>
                                <th>Отзыв</th>
                                <th>Время прохождения</th>
                            </tr>
                        </MDBTableHead>
                        <MDBTableBody>
                            {gameTableData}
                        </MDBTableBody>
                    </MDBTable>
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