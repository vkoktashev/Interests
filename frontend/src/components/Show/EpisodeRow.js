import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import Rating from "react-rating";
import {
    MDBIcon
} from "mdbreact";

function EpisodeRow ( {episode, season, showID} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [episode]
    );

    return(
        <div className="episodeRow">
            <a className="episodeRowName episodeLink" 
                href={window.location.origin + '/show/' + showID + '/season/' + season + '/episode/'+ episode} 
                onClick={(e) => { history.push('/show/' + showID + '/season/' + season + '/episode/'+ episode); e.preventDefault();}}
                >
                Серия {episode}
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

export default EpisodeRow;