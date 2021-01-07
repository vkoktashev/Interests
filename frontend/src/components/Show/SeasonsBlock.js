import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import { Map } from 'immutable';
import SeasonBlock from './SeasonBlock';

function SeasonsBlock ( {showID, seasons, setShowEpisodeUserStatus} ) {
    

    const [needHeader, setNeedHeader] = useState(false);

    let changedEpisodes = [];

    function updateEpisodes(episode){
        if (episode.addEpisode)
            changedEpisodes.push(episode.episode);
        else{
            const index = changedEpisodes.findIndex((i => i.episode_number === episode.episode.episode_number && i.season_number === episode.episode.season_number));
            if (index > -1)
                changedEpisodes.splice(index, 1);
        }
        if (changedEpisodes.length > 0)
            setNeedHeader(true);
        else
            setNeedHeader(false);
        console.log(changedEpisodes); 
    }

    return(
        <div>
            { 
                seasons?.map((season) => 
                    <SeasonBlock showID={showID} seasonNumber={season.season_number}
                        onChangeEpisodes={(episodes) => {console.log(episodes)}} key={season.season_number}
                        onChangeStatus={(status) => updateEpisodes(status)}/>
                )  
            } 
            <div className="saveEpisodesHeader" hidden={!needHeader}>
                <button className="saveEpisodesButton"
                    onClick={() =>  { 
                        setShowEpisodeUserStatus({episodes: changedEpisodes},  showID);
                        changedEpisodes = [];
                        setNeedHeader(false);
                        }}>
                    Сохранить
                </button>
            </div>
        </div>  
    )
}


export default SeasonsBlock;
