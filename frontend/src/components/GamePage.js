import React, {
    useEffect,
    useState
} from "react";
import {
    useParams
} from "react-router-dom";
import {
    MDBRow,
    MDBCol
} from "mdbreact";

import '../index.css';

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

import LoginForm from "./LoginForm";
import Navbar from "./Navbar";

/**
 * Основная страница приложения
 */
function GamePage ( {requestGame, game, requestError, loggedIn} ) {
    let { id } = useParams();
    const [background, setBackground] = useState('https://mdbootstrap.com/img/Photos/Horizontal/Nature/full page/img(20).jpg');
    const [gameName, setGameName] = useState('Game');

    useEffect(
		() => {
			requestGame(id);
		},
		[]
    );

    useEffect(
		() => {
            if (game != null){
                setBackground(game.rawg.background_image_additional);
                setGameName(game.rawg.name);
            }
		},
		[game]
    );
    
    return (
			<div className="bg" style={{backgroundImage: `url(${background})`}}>
				<Navbar/>
                <MDBRow className="mb-4" style={{top:"300px"}}>
                    <MDBCol md="4"> <h1>{gameName}</h1></MDBCol>
                 </MDBRow>
				<LoginForm/>
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
