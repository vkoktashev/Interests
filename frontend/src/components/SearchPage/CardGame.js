import React, { useEffect, useState } from "react";
import {
    useHistory
  } from "react-router-dom";


function CardGame( {game} ) {
    let history = useHistory();
    const [date, setDate] = useState("");
    const [name, setName] = useState("");

    useEffect(() =>{
            if (game.released){
                let mas = game.released.split("-");
                let newDate = mas[2] + "." + mas[1] + "." + mas[0];
                setDate(newDate);
            }else
                setDate("");

            if (game.name.length > 55){
                let newName = game.name.substr(0, 55) + "...";
                setName(newName);
            }else
                setName(game.name);
        },
        [game]
    );

    /*const mouseDownHandler = ( event ) => {
        if( event.button === 1 ) {
            console.log(window.location.origin + '/game/' + game.slug );

        }
      }*/

    return(
        <div className="searchCardGame" >
            <div className="searchCardGameImage" style={{backgroundImage: `url(${game.background_image})`}}> </div>
            <div className="searchCardGameText">
                <a href={window.location.origin + '/game/' + game.slug} 
                    onClick={(e) => { history.push('/game/' + game.slug); e.preventDefault();}}>
                        <h4 >{name}</h4>
                </a>
                <p>{date}</p>
            </div>
        </div> 
    )
}
//onMouseDown={mouseDownHandler} 

export default CardGame;
