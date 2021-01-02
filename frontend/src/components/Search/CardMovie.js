import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";

function CardMovie ( {movie} ) {
    let history = useHistory();

    const [date, setDate] = useState("");
    const [name, setName] = useState("");

    useEffect(() =>{
            if (movie.release_date){
                let mas = movie.release_date.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setDate(newDate);
            }else
                setDate("");

            if (movie.title.length > 55){
                let newName = movie.title.substr(0, 55) + "...";
                setName(newName);
            }else
                setName(movie.title);
        },
        [movie]
    );

    return(
        <div className="searchCardMovie" >
            <div className="searchCardMovieImage" style={{backgroundImage: `url(${"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + movie.poster_path})`}}> </div>
            <div className="searchCardMovieText">
                <a href={window.location.origin + '/movie/' + movie.id} 
                    onClick={(e) => { history.push('/movie/' + movie.id); e.preventDefault();}}>
                        <h4 >{name}</h4>
                </a>
                <p>{date}</p>
            </div>
        </div> 
    )
}

export default CardMovie;
