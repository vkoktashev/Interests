import React from "react";
import FriendsActivityRow from "./FriendsActivityRow";

function FriendsActivity({ info }) {
	return <div className='friendsBlock'>{typeof info !== "undefined" ? info?.map((friendInfo) => <FriendsActivityRow info={friendInfo} key={friendInfo.user.id} />) : ""}</div>;
}

export default FriendsActivity;
