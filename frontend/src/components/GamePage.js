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
function GamePage ( {requestGame, game, requestError, loggedIn, openLoginForm, setGameStatus, gameIsLoading
    } ) {
    let { id } = useParams();
    const [genres, setGenres] = useState("");
    const [metascoreBlock, setMetascoreBlock] = useState("");
    const [review, setReview] = useState("");
    const [spentTime, setSpentTime] = useState(0);
    const [developers, setDevelopers] = useState("");
    const [hltbInfo, setHtlbInfo] = useState({gameplay_main_extra: -1, gameplay_main: -1, gameplay_comletionist: -1});

    useEffect(
		() => {
            requestGame(id);
        },
        // eslint-disable-next-line
		[id, requestGame, loggedIn]
    );

    useEffect(
		() => {
            if (game.rawg.genres){
                let newGenres = ""
                for (let i = 0; i < game.rawg.genres.length; i++){
                    newGenres += game.rawg.genres[i].name;
                    if (i !== game.rawg.genres.length - 1)
                        newGenres += ", ";
                }
                 setGenres(newGenres);   
            }

            if (game.rawg.metacritic){
                setMetascoreBlock(
                    <div>
                        <div className="metacritic">
                            <p>{game.rawg.metacritic}</p>
                        </div>
                        <p className="metacriticText">Metascore</p>
                    </div>
                );
            }else{
                setMetascoreBlock("");
            }

            if (game.hltb){
                setHtlbInfo(game.hltb);
            }else{
                setHtlbInfo({gameplay_main_extra: -1, gameplay_main: -1, gameplay_comletionist: -1});
            }

            if (game.user_info){
                setReview(game.user_info.review);
                setSpentTime(game.user_info.spent_time);
            }

            if (game.rawg.developers){
                let newDevelopers = ""
                for (let i = 0; i < game.rawg.developers.length; i++){
                    newDevelopers += game.rawg.developers[i].name;
                    if (i !== game.rawg.developers.length - 1)
                    newDevelopers += ", ";
                }
                setDevelopers(newDevelopers);   
            }
		},
		[game]
    );
    
    return (
            <div>
			<div className="bg" style={{backgroundImage: `url(${game.rawg.background_image_additional?game.rawg.background_image_additional:game.rawg.background_image})`}}/>
                <LoadingOverlay
                    active={gameIsLoading}
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
                                        <img src={game.rawg.background_image} className="img-fluid" alt=""/>
                                    </MDBCol>
                                    <MDBCol size="6">
                                        <h1>{game.rawg.name}</h1>
                                        <p style={{marginBottom: "2px"}}>Разработчики: {developers}</p>
                                        <p style={{marginBottom: "2px"}}>Дата релиза: {game.rawg.released}</p>
                                        <p style={{marginBottom: "2px"}}>Жанр: {genres}</p>
                                        <p style={{marginBottom: "4px"}} 
                                            hidden={hltbInfo.gameplay_main < 0}>
                                            <MDBIcon far icon="clock" /> Время прохождения: {hltbInfo.gameplay_main} {hltbInfo.gameplay_main_unit}
                                        </p>
                                        <br/>
                                        <Rating stop={10}
                                            emptySymbol={<MDBIcon far icon="star" size="1x" style={{fontSize: "25px"}}/>}
                                            fullSymbol={[1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x" style={{fontSize: "25px"}} title={n}/>)}
                                            initialRating={game.user_info?game.user_info.score:0}
                                            readonly={!loggedIn | (!game.user_info)}
                                            onChange={(score) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                    setGameStatus({score: score });
                                                }}
                                            }
                                        /> <br/>
                                        <StatusButtonGroup
                                            statuses={['Не играл', 'Буду играть', 'Играю', 'Дропнул', 'Прошел']}
                                            activeColor='#4527a0' 
                                            userStatus={game.user_info?game.user_info.status:'Не играл'}
                                            onChangeStatus={(status) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                   setGameStatus({ status: status });
                                                }
                                            }}/>
                                    </MDBCol>
                                    <MDBCol size="1">
                                        { metascoreBlock }
                                    </MDBCol>
                                </MDBRow> 
                                <MDBRow className="gameContentBody"> 
                                    <MDBCol >
                                        <h3 style={{paddingTop: "15px"}}>Описание</h3>
                                        <div dangerouslySetInnerHTML={{__html: game.rawg.description}} />
                                    </MDBCol>
                                </MDBRow>
                                <MDBRow>
                                <MDBCol size="6" style={{paddingLeft: "20px"}}>
                                    <h3 style={{paddingTop: "10px"}}>Отзывы</h3>
                                        
                                        <MDBInput 
                                            type="textarea" 
                                            id="reviewInput"
                                            label="Ваш отзыв" 
                                            value={review}
                                            onChange={(event) =>setReview(event.target.value)}
                                            outline
                                        />
                                        <MDBInput
                                            type="number"
                                            id="spentTimeInput"
                                            label="Время прохождения (часы)" 
                                            value={spentTime}
                                            onChange={(event) =>setSpentTime(event.target.value)}
                                        />
                                        <button 
                                            className={'savePreviewButton'} 
                                            disabled={!loggedIn | (!game.user_info)}
                                            onClick={() => {
                                                    if (!loggedIn){
                                                        openLoginForm();
                                                    }else{
                                                        setGameStatus({   review: document.getElementById('reviewInput').value, spent_time: document.getElementById('spentTimeInput').value });
                                                    }
                                                }
                                            }
                                            >
                                            Сохранить
                                        </button>
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
    game: selectors.getContentGame(state),
    gameIsLoading: selectors.getIsLoadingContentGame(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestGame: (id) => {
            dispatch(actions.requestGame(id));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        /*patchGameStatus: (user_info) => {
            dispatch(actions.patchGameStatus(user_info));
        },*/
        setGameStatus: (status) => {
            dispatch(actions.setGameStatus(status));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(GamePage);
