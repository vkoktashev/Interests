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
        <div className="searchCardUser" >
            <div className="searchCardUserImage" style={{backgroundImage: `url(${'http://twitchinfo.ru/wp-content/uploads/2020/08/Как-сделать-портрет-по-фотографии-Аватарку-для-Youtube-VK-INSTAGRAMM-TIKTOK-TWITCH-0-12-03-920-1024x576.jpg'})`}}> </div>
            <div className="searchCardUserText">
                <a href={window.location.origin + '/user/' + user.id} 
                    onClick={(e) => { history.push('/user/' + user.id); e.preventDefault();}}>
                        <h4 >{user.username}</h4>
                </a>
            </div>
        </div> 
    )
}

export default CardUser;
