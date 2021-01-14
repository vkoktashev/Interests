import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";

function CardShow ( {show} ) {
    let history = useHistory();

    const [date, setDate] = useState("");

    useEffect(() =>{
            if (show.first_air_date){
                let mas = show.first_air_date.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setDate(newDate);
            }else
                setDate("");
        },
        [show]
    );

    return(
        <div className="searchCardMovie" >
            <div className="searchCardMovieImage" style={{backgroundImage: `url(${"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.poster_path})`}}> </div>
            <div className="searchCardMovieText">
                <div className="searchCardMovieName">
                    <a href={window.location.origin + '/show/' + show.id} 
                        onClick={(e) => { history.push('/show/' + show.id); e.preventDefault();}}
                        title={show.name}>
                        <h4>{show.name}</h4>
                    </a>
                </div>   
                <p>{date}</p>
            </div>
        </div> 
    )
}

export default CardShow;
