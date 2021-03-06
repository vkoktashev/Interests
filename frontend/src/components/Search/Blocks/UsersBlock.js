import React from "react";
import FriendBlock from "../../Common/FriendBlock";

function UsersBlock({ users, hidden }) {
	return (
		<div hidden={hidden}>
			<h3>Пользователи</h3>
			<FriendBlock users={users} />
		</div>
	);
}

export default UsersBlock;
