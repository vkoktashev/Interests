import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import Rating from "react-rating";
import {
    MDBIcon
} from "mdbreact";

function EpisodeRow ( {episode} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [episode]
    );

    function parseDate(date){
        let newDate = new Date(date);
        return newDate.toLocaleTimeString("ru-RU");
    }

    return(
        <div className="episodeRow">
            Серия {episode + '  '}  
            <Rating stop={10}
                emptySymbol={<MDBIcon far icon="star" size="1x"/>}
                fullSymbol={[1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x" title={n}/>)}
                initialRating={5}
                readonly={false}
                className='episodeRating'
            />
        </div>
    )
}

export default EpisodeRow;