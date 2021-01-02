import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import Rating from "react-rating";
import {
    MDBIcon
} from "mdbreact";

function DetailedEpisodeRow ( {episode, showID} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [episode]
    );

    function parseDate(date){
        let newDate = new Date(date);
        return newDate.toLocaleDateString("ru-RU");
    }

    return(
        <div className="episodeRow detailRow">
            <p className="episodeDate">{parseDate(episode.air_date)}</p>
            <a className="episodeRowName episodeLink" 
                href={window.location.origin + '/show/' + showID + '/season/' + episode.season_number + '/episode/'+ episode.episode_number} 
                onClick={(e) => { history.push('/show/' + showID + '/season/' + episode.season_number + '/episode/'+ episode.episode_number); e.preventDefault();}}
                >
                Серия {episode.episode_number} - {episode.name}
            </a>  
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

export default DetailedEpisodeRow;