import React, { useEffect, useState} from "react";
import { useHistory } from "react-router-dom";
import './style.css';
import Rating from "react-rating";
import {
    MDBIcon
} from "mdbreact";

function DetailedEpisodeRow ( {episode, showID, setShowEpisodeUserStatus, loggedIn, userInfo} ) {
    let history = useHistory();
    const [userRate, setUserRate] = useState(0);

    useEffect(() =>{
            setUserRate(userInfo?.score);
        },
        [userInfo]
    );

    function parseDate(date){
        let newDate = new Date(date);
        return newDate.toLocaleDateString("ru-RU");
    }

    return(
        <div className="episodeRow detailRow">
            <p className="episodeDate">{parseDate(episode.air_date)}</p>
            <a className="episodeRowName episodeLink detailRow" 
                href={window.location.origin + '/show/' + showID + '/season/' + episode.season_number + '/episode/'+ episode.episode_number} 
                onClick={(e) => { history.push('/show/' + showID + '/season/' + episode.season_number + '/episode/'+ episode.episode_number); e.preventDefault();}}
                >
                Серия {episode.episode_number} - {episode.name}
            </a>
            <div hidden={!loggedIn} className="episodeRowRate"> 
                <Rating start={-1} stop={10}
                    emptySymbol={[<MDBIcon icon="eye-slash" />].concat([1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon far icon="star" size="1x" />))}
                    fullSymbol={[<MDBIcon icon="eye" />].concat([1,2,3,4,5,6,7,8,9,10].map(n => <MDBIcon icon="star" size="1x"title={n}/>))}
                    readonly={!loggedIn}
                    initialRating={userRate}
                    onChange={(score) => {
                            setUserRate(score);
                            setShowEpisodeUserStatus({episodes: [ {
                                    season_number: episode.season_number,
                                    episode_number: episode.episode_number,
                                    score: score
                                }]},
                                showID);
                        }
                    }
                />
            </div>
            
        </div>
    )
}

export default DetailedEpisodeRow;