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
    MDBTableBody,
    MDBDataTable
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

    const gameColumns = [
        {
          label: 'Название',
          field: 'name',
          sort: 'asc'
        },
        {
          label: 'Статус',
          field: 'status',
          sort: 'asc'
        },
        {
          label: 'Оценка',
          field: 'score',
          sort: 'asc'
        },
        {
          label: 'Отзыв',
          field: 'review',
          sort: 'asc'
        },
        {
          label: 'Время прохождения',
          field: 'spent_time',
          sort: 'asc'
        }
      ];

    const [gameTableData, setGameTableData] = useState({
        columns: gameColumns,
        rows: [
        ]
    });

    useEffect(
		() => {
            getUserInfo(username);
		},
		[username]
    );

    useEffect(
		() => {
			if (userInfo && userInfo.games){
                setGameTableData({
                    columns: gameColumns,
                    rows: userInfo.games.map((game) => {
                        return {
                                name: <a name={game.game.rawg_name} 
                                        href={'/game/' + game.game.rawg_slug}
                                        onClick={ () =>  history.push('/game/' + game.game.rawg_slug)  }
                                >
                                    {game.game.rawg_name}
                                </a>,
                                status: game.status,
                                score: game.score,
                                review: game.review,
                                spent_time: game.spent_time,
                                spc: game.game.rawg_name
                            }      
                    })
                });
            } 
			else
                setGameTableData({
                    columns: gameColumns,
                    rows: [
                    ]
                });
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
                        <hr style={{ color: '#6C0AAB', backgroundColor: '#4527a0', height: 2.5,  borderColor : '#6C0AAB' }}/>
                        <MDBDataTable
                            striped
                            bordered
                            small
                            data={gameTableData}
                            info={false}
                            barReverse={true}
                            noRecordsFoundLabel="Ничего не найдено!"
                            paginationLabel={["Предыдущая", "Следующая"]}
                            entriesLabel="Показывать игр на странице"
                            searchLabel='Поиск'
                            />
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