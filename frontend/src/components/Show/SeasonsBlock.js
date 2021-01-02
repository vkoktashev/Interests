import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import EpisodeRow from './EpisodeRow';

function SeasonsBlock ( {seasons, showID} ) {
    let history = useHistory();

    const [hereSeasons, setHereSeasons] = useState([]);

    useEffect(() =>{
        setHereSeasons([]);
        if (seasons){
            let newSeasons = [];
            for (let season in seasons){
                if (seasons[season].name !== 'Спецматериалы'){
                    let newSeason = seasons[season];
                    newSeason.episodes = [];
                    for (let i = 1; i <= seasons[season].episode_count; i++)
                        newSeason.episodes.push(i);
                    newSeasons.push(newSeason);
                }
            }
            setHereSeasons(newSeasons);
        }
            
    },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [seasons]
    );

    return(
        <div>
            { 
                hereSeasons.map((season) => 
                    <div key={season.id} className="seasonBlock">
                        <div className='seasonName'>
                            <a 
                                href={window.location.origin + '/show/' + showID + '/season/' + season.season_number} 
                                onClick={(e) => { history.push('/show/' + showID + '/season/' + season.season_number); e.preventDefault();}}
                                >
                                <h5 > {season.name} </h5>
                            </a>
                        </div>
                        <details open={false} className='episodeRows'>
                            <summary>Развернуть</summary>
                                <ul>
                                {  season.episodes.map((episode) => <li className="episode"><EpisodeRow episode={episode} season={season.season_number} showID={showID} key={season.id+episode}/></li>) }
                                </ul>
                        </details>
                        
                    </div>
                )  
            } 
        </div>  
    )
}

export default SeasonsBlock;
