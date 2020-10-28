import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";

function SearchCardGame( {game} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [game]
    );

    return(
        <div className="searchCardGame" 
            style={{backgroundImage: `url(${game.background_image})`}}
            onClick={() => history.push('/game/' + game.slug)}>
            <h3 className="searchCardGame" >{game.name}</h3>
        </div>  
    )
}

export default SearchCardGame;
