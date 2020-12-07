import React from "react";
import FriendsActivityRow from './FriendsActivityRow';

function FriendsActivity ( {info} ) {

    return(
        <div className="friendsBlock">
            { info.friends_info.map((friendInfo) => <FriendsActivityRow info={friendInfo}/>) }
        </div>  
    )
}

export default FriendsActivity;