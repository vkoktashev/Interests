import React from "react";

import CardUser from '../Common/CardUser';

function FriendBlock ( {users} ) {

    return(
        <div>
            <h2 style={{marginBottom: "25px"}}>Мои подписки: </h2>
            {users.map((user) => <CardUser user={user}/>) }
        </div>  
    )
}

export default FriendBlock;
