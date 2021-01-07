import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import { Map } from 'immutable';
import SeasonBlock from './SeasonBlock';

function SeasonsBlock ( {showID, seasons, setShowEpisodeUserStatus} ) {
    

    const [needHeader, setNeedHeader] = useState(false);
    const [changeEpisodes, setChangedEpisodes] = useState([]);

    function updateEpisodes(){

    }

    return(
        <div>
            { 
                seasons?.map((season) => 
                    <SeasonBlock showID={showID} seasonNumber={season.season_number} onChangeEpisodes={(episodes) => {console.log(episodes)}} key={season.season_number}/>
                )  
            } 
            <div className="saveEpisodesHeader" hidden={!needHeader}>
                <button className="saveEpisodesButton"
                    onClick={() => updateEpisodes()}>
                    Сохранить
                </button>
            </div>
        </div>  
    )
}


export default SeasonsBlock;
