import React from "react";

import CardUser from "../Common/CardUser";

function FriendBlock({ users }) {
	return (
		<div className='friendsCards'>
			{users.map((user) => (
				<CardUser user={user} key={user.id} />
			))}
			{users.length < 1 ? "Пользователи не найдены" : ""}
		</div>
	);
}

export default FriendBlock;
