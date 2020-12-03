import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";

function CardGame( {game} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [game]
    );

    /*const mouseDownHandler = ( event ) => {
        if( event.button === 1 ) {
            console.log(window.location.origin + '/game/' + game.slug );

        }
      }*/

    return(
        <a href={window.location.origin + '/game/' + game.slug} 
            onClick={(e) => { history.push('/game/' + game.slug); e.preventDefault();}}> 
            <div className="searchCardGame" 
                style={{backgroundImage: `url(${game.background_image})`}}
                >
                <h3 className="searchCardGame" >{game.name}</h3>
            </div>
        </a>
    )
}
//onMouseDown={mouseDownHandler} 

export default CardGame;
