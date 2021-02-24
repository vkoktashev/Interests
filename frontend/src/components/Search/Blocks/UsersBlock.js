import React from "react";
import CardUser from "../../Common/CardUser";

function UsersBlock({ users, hidden }) {
	return (
		<div hidden={hidden}>
			<h3>Пользователи</h3>
			<div className='searchCardsGroup'>
				{users.map((user) => (
					<CardUser user={user} key={user.username} />
				))}
			</div>
		</div>
	);
}

export default UsersBlock;
