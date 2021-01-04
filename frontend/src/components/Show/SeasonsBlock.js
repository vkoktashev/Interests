import React, { useEffect, useState} from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import { Map } from 'immutable';
import EpisodeRow from './EpisodeRow';

function SeasonsBlock ( {seasons, showID, setShowEpisodeUserStatus, loggedIn} ) {
    let history = useHistory();

    const [hereSeasons, setHereSeasons] = useState([]);
    const [isChecked, setIsChecked] = useState(false);
    const [checkboxes, setCheckboxes] = useState(Map({}));
    const [needHeader, setNeedHeader] = useState(false);
    

    useEffect(() =>{
        setHereSeasons([]);
        if (seasons){
            let newSeasons = [];
            let newCheckBoxes = {}
            for (let season in seasons){
                newCheckBoxes[seasons[season].season_number] = {};
                if (seasons[season].name !== 'Спецматериалы'){
                    let newSeason = seasons[season];
                    newSeason.episodes = [];
                    for (let i = 1; i <= seasons[season].episode_count; i++){
                        newSeason.episodes.push(i);
                        newCheckBoxes[seasons[season].season_number][i] = {}
                        newCheckBoxes[seasons[season].season_number][i].checked = seasons[season].episodes_user_info.find(info => info.episode_number === i)?
                            seasons[season].episodes_user_info.find(info => info.episode_number === i).score>-1:false;
                    }
                        
                    newSeasons.push(newSeason);
                }
            }
            setCheckboxes(Map(newCheckBoxes) );
            setHereSeasons(newSeasons);
        }
            
    },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [seasons]
    );

    function changeEpisode(newValue, season, episode){
        let newCheckboxes = checkboxes.setIn([season.toString(), episode, 'checked'], newValue);
        setCheckboxes(newCheckboxes);
        setNeedHeader(true);
    }

    function changeSeasonEpisodes(toWatched, season){
        let current = checkboxes.get(season.toString());
        for (let episode in current)
            current[episode].checked = toWatched;
        let newCheckboxes = checkboxes.set(season.toString(), current);
        setCheckboxes(newCheckboxes);
        setNeedHeader(true);
    }

    function updateEpisodes(){
        let current = checkboxes.toJS();
        let changes = [];
        for (let season in current){
            for (let episode in current[season.toString()]){
                if (current[season.toString()][episode].checked !== (seasons[season.toString()].episodes_user_info.find(info => info.episode_number === parseInt(episode))?.score > -1))
                    changes.push({
                        season_number: season,
                        episode_number: episode,
                        score: current[season][episode].checked?0:-1
                    });
            }
        }
        console.log(changes);
        setShowEpisodeUserStatus({episodes: changes}, showID);
        setNeedHeader(false);
    }

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
                                <div style={{marginLeft: '5px'}}>
                                    Выбрать все&nbsp;
                                    <input type="checkbox" checked={isChecked} onChange={(res) => {setIsChecked(!isChecked); changeSeasonEpisodes(res.target.checked, season.season_number)}}></input>
                                </div>
                                <ul>
                                {  season.episodes.map((episode, counter) => <li className="episode" key={counter}>
                                            <EpisodeRow loggedIn={loggedIn} episode={episode} season={season.season_number} showID={showID} 
                                                userInfo={season.episodes_user_info.find(info => info.episode_number === episode)} 
                                                setShowEpisodeUserStatus={setShowEpisodeUserStatus}
                                                checked={checkboxes.get(season.season_number.toString())?.[episode]?.checked}
                                                onCheckBox={(value) => { changeEpisode(value, season.season_number, episode) } 
                                                }
                                                />
                                        </li>) }
                                </ul>
                        </details>
                        
                    </div>
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
