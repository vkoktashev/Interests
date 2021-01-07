import React, { useEffect, useState } from "react";
import {
    useHistory
  } from "react-router-dom";
import './style.css';
import { connect } from 'react-redux'; 
import LoadingOverlay from 'react-loading-overlay';
import * as selectors from '../../store/reducers';
import * as actions from '../../store/actions';
import DetailedEpisodeRow from "./DetailedEpisodeRow";

function SeasonBlock ( {showID, seasonNumber, loggedIn, showSeason, showSeasonIsLoading, showUserInfo, requestShowSeason, requestShowSeasonUserInfo, setShowEpisodeUserStatus} ) {
    let history = useHistory();
    const [isChecked, setIsChecked] = useState(false);

    useEffect(
		() => {
            requestShowSeason(showID, seasonNumber);
        },
        // eslint-disable-next-line
		[showID, seasonNumber, requestShowSeason]
    );

    useEffect(
		() => {
            if (loggedIn)
                requestShowSeasonUserInfo(showID, seasonNumber);
        },
        // eslint-disable-next-line
		[loggedIn, showID, seasonNumber]
    );

    function getEpisodeByNumber(episodes, number){
        for (let episode in episodes)
            if (episodes[episode].episode_number === number)
                return episodes[episode];
    }

    return(
        <LoadingOverlay active={showSeasonIsLoading} spinner text='Загрузка...' >
        <div key={showSeason?.tmdb?.id} className="seasonBlock">
            <div className='seasonName'>
                <a href={window.location.origin + '/show/' + showID + '/season/' + seasonNumber} 
                    onClick={(e) => { history.push('/show/' + showID + '/season/' + seasonNumber); e.preventDefault();}}
                >
                    <h5 > {showSeason?.tmdb?.name} </h5>
                </a>
            </div>
            <details open={false} className='episodeRows'>
                <summary>Развернуть</summary>
                    <div style={{marginLeft: '5px'}} hidden={!loggedIn}>
                        Выбрать все&nbsp;
                        <input type="checkbox" checked={isChecked} onChange={ (res) => { setIsChecked(res.target.checked); }}  />
                    </div>
                    <ul>
                    {  showSeason?.tmdb?.episodes?.map((episode, counter) => <li className="episode" key={counter}>
                            <DetailedEpisodeRow episode={episode} showID={showID} loggedIn={loggedIn} userInfo={getEpisodeByNumber(showUserInfo?.episodes, episode?.episode_number)} setShowEpisodeUserStatus={setShowEpisodeUserStatus}/>
                        </li>) }
                    </ul>
            </details>
            
        </div>
        </LoadingOverlay>
        
    )
}

const mapStateToProps = (state, ownProps) => ({
    loggedIn: selectors.getLoggedIn(state),
    showSeason: selectors.getContentShowSeasons(state, ownProps.seasonNumber),
    showSeasonIsLoading: selectors.getIsLoadingContentShowSeasons(state, ownProps.seasonNumber),
    showUserInfo: selectors.getContentShowSeasonsUserInfo(state, ownProps.seasonNumber)
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShowSeason: (showID, seasonNumber) => {
            dispatch(actions.requestShowSeasons(showID, seasonNumber));
        },
        requestShowSeasonUserInfo: (showID, seasonNumber) => {
            dispatch(actions.requestShowSeasonsUserInfo(showID, seasonNumber));
        },
        setShowEpisodeUserStatus: (status, showID) => {
            dispatch(actions.setShowEpisodesStatus(status, showID));
        },
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(SeasonBlock);