import React, { useEffect} from "react";
import {
    useHistory
  } from "react-router-dom";

function CardUser ( {user} ) {
    let history = useHistory();

    useEffect(() =>{
            
        },
        [user]
    );

    return(
        <div className="searchCardGame" 
            style={{backgroundImage: `url(${'http://twitchinfo.ru/wp-content/uploads/2020/08/Как-сделать-портрет-по-фотографии-Аватарку-для-Youtube-VK-INSTAGRAMM-TIKTOK-TWITCH-0-12-03-920-1024x576.jpg'})`}}
            onClick={() => history.push('/user/' + user.id)}>
            <h3 className="searchCardGame" >{user.username}</h3>
        </div> 
    )
}

export default CardUser;
