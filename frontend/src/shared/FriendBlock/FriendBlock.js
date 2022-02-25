import React from "react";
import classnames from "classnames";
import "./friend-block.sass";

import CardUser from '../CardUser';

function FriendBlock({ users, className }) {
	return (
		<div className={classnames("friends-block", className)}>
			{users.map((user) => (
				<CardUser user={user} key={user.id} className='friends-block__friend' />
			))}
			{users.length < 1 ? "Пользователи не найдены" : ""}
		</div>
	);
}

export default FriendBlock;
