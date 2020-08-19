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
    MDBIcon
} from "mdbreact";

import Rating from "react-rating";
import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';
import StatusButtonGroup from "./StatusButtonGroup";


/**
 * Основная страница приложения
 */
function GamePage ( {requestGame, game, requestError, loggedIn, openLoginForm, patchGameStatus} ) {
    let { id } = useParams();
    const [genres, setGenres] = useState("");
    const [metascoreBlock, setMetascoreBlock] = useState("");

    useEffect(
		() => {
			requestGame(id);
		},
		[id, requestGame]
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
		},
		[game]
    );
    
    return (
			<div className="bg" style={{backgroundImage: `url(${game.rawg.background_image_additional?game.rawg.background_image_additional:game.rawg.background_image})`}}>
                <MDBContainer>
                    <MDBRow>
                        <MDBCol md="0.5"></MDBCol>
                        <MDBCol className="gameContentPage"> 
                            <MDBContainer>
                                <MDBRow className="gameContentHeader">
                                    <MDBCol size="5">
                                        <img src={game.rawg.background_image} className="img-fluid" alt=""/>
                                    </MDBCol>
                                    <MDBCol size="6">
                                        <h1>{game.rawg.name}</h1>
                                        <p style={{marginBottom: "2px"}}>Разработчик: {game.rawg.developers[0].name}</p>
                                        <p style={{marginBottom: "2px"}}>Дата релиза: {game.rawg.released}</p>
                                        <p>Жанр: {genres}</p>
                                        <Rating stop={10}
                                            emptySymbol={<MDBIcon far icon="star" size="1x" style={{fontSize: "25px"}} />}
                                            fullSymbol={<MDBIcon icon="star" size="1x" style={{fontSize: "25px"}} />}
                                            />
                                        <StatusButtonGroup loggedIn={loggedIn} 
                                            statuses={['Не играл', 'Буду играть', 'Играю', 'Дропнул', 'Прошел']}
                                            activeColor='#6c0aab' 
                                            userStatus={game.user_info?game.user_info.status:'Не играл'}
                                            onChangeStatus={(status) => {
                                                if (!loggedIn){
                                                    openLoginForm();
                                                }else{
                                                    patchGameStatus(status);
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
                            </MDBContainer>
                        </MDBCol>
                        <MDBCol md="0.5"></MDBCol>
                    </MDBRow>
                 </MDBContainer>
			</div>
    	);
}

const mapStateToProps = state => ({
    loggedIn: selectors.getLoggedIn(state),
    requestError: selectors.getGameRequestError(state),
    game: selectors.getContentGame(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestGame: (id) => {
            dispatch(actions.requestGame(id));
        },
        openLoginForm: () => {
            dispatch(actions.openLoginForm());
        },
        patchGameStatus: (status) => {
            dispatch(actions.patchGameStatus(status));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(GamePage);
