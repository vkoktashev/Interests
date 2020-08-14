import React, {
    useEffect,
    useState
} from "react";
import {
    useParams
} from "react-router-dom";

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
    const [background, setBackground] = useState(null);

    useEffect(
		() => {
			requestGame(id);
		},
		[id, requestGame]
    );

    useEffect(
		() => {
            if (game != null){
                console.log(game.rawg.background_image);
                setBackground(game.rawg.background_image);
                console.log(background);
            }
		},
		[game]
    );
    
    return (
			<div className="bg" backgroundImage={background}>
				<Navbar/>
				<LoginForm/>
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
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(GamePage);
