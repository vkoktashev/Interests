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


/**
 * Основная страница приложения
 */
function GamePage ( {requestGame, game, requestError, loggedIn} ) {
    let { id } = useParams();
    const [genres, setGenres] = useState("");

    useEffect(
		() => {
			requestGame(id);
		},
		[]
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
                                        <div>
                                            <button className="gameContentStatuses" onClick={()=>{}} >Не играл</button>
                                            <button className="gameContentStatuses">К прохождению</button>
                                            <button className="gameContentStatuses">Играю</button>
                                            <button className="gameContentStatuses">Дропнул</button>
                                            <button className="gameContentStatuses">Прошел</button>
                                        </div>
                                    </MDBCol>
                                    <MDBCol size="1">
                                        <div className="metacritic">
                                            <p>{game.rawg.metacritic}</p>
                                        </div>
                                        <p className="metacriticText">Metascore</p>
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
/*
<MDBRow className="mb-4">
                <MDBCol md="4">
                    <img src={game.rawg.} className="img-fluid" alt="" />
                </MDBCol>
                </MDBRow>*/

const mapStateToProps = state => ({
    loggedIn: selectors.getLoggedIn(state),
    requestError: selectors.getGameRequestError(state),
    game: selectors.getContentGame(state)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestGame: (id) => {
			dispatch(actions.requestGame(id));
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(GamePage);
