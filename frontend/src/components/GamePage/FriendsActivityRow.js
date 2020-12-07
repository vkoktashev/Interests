import React from "react";

function FriendsActivityRow ( {info} ) {

    return(
        <div className="">
            {info.user.username}
        </div>  
    )
}

export default FriendsActivityRow;