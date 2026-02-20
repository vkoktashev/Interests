import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import CardUser from '../../../shared/CardUser';
import {IUserSearchItem} from './searchTypes';
import './user-cards.scss';

interface IUserCardsProps {
	users: IUserSearchItem[];
	hidden?: boolean;
}

function UserCards({users, hidden}: IUserCardsProps) {
	const bem = useBem('search-users');

	return (
		<div hidden={hidden} className={bem.block()}>
			{users.length > 0 ? (
				<div className={bem.element('grid')}>
					{users.map(user => (
						<CardUser
							key={user.id}
							user={{
								id: user.id,
								username: user.username || `Пользователь ${user.id}`,
								avatar: user.avatar,
								image: user.image,
							}}
							className={bem.element('card')}
						/>
					))}
				</div>
			) : (
				<div className={bem.element('empty')}>
					Пользователи не найдены
				</div>
			)}
		</div>
	);
}

export default UserCards;
