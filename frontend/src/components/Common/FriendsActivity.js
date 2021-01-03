import React from "react";
import FriendsActivityRow from './FriendsActivityRow';

function FriendsActivity ( {info} ) {

    return(
        <div className="friendsBlock">
            { info.friends_info.map((friendInfo) => <FriendsActivityRow info={friendInfo} key={friendInfo.user.id}/>) }
        </div>  
    )
}

export default FriendsActivity;