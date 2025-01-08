import React from "react";
import './friend-block.scss';

import CardUser from '../CardUser';
import {useBem} from '@steroidsjs/core/hooks';

function FriendBlock({ users, className }: any) {
	const bem = useBem('friends-block');
	return (
		<div className={bem(bem.block(), className)}>
			{users.map((user) => (
				<CardUser
					user={user}
					key={user.id}
					className={bem.element('friend')}
				/>
			))}
			{users.length < 1 ? "Пользователи не найдены" : ""}
		</div>
	);
}

export default FriendBlock;
