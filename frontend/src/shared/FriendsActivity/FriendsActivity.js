import React from "react";
import FriendActivity from "./views/FriendActivity";

function FriendsActivity({ info }) {
	return (
		<div className='friends-activity'>
			{info?.map((friendInfo) => (
				<FriendActivity info={friendInfo} key={friendInfo.user.id} className='friends-activity__element' />
			))}
		</div>
	);
}

export default FriendsActivity;
