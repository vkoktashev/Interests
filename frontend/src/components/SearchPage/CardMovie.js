import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";

function CardMovie ( {movie} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [movie]
    );

    return(
        <a href={window.location.origin + '/movie/' + movie.id} 
            onClick={(e) => { history.push('/movie/' + movie.id); e.preventDefault();}}
        > 
            <div className="searchCardGame" 
                style={{backgroundImage: `url(${"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + movie.poster_path})`}}
            >
                <h3 className="searchCardGame" >{movie.title}</h3>
            </div> 
        </a>
    )
}

export default CardMovie;
