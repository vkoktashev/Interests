import React from "react";

import CardUser from '../Common/CardUser';

function FriendBlock ( {users} ) {

    return(
        <div className="friendsBlock">
            { users.map((user) => <CardUser user={user} key={user.id}/>) }
        </div>  
    )
}

export default FriendBlock;
