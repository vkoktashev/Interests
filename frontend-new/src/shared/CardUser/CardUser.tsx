import React from "react";
import "./card-user.scss";
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_USER} from '../../routes';
import {useBem} from '@steroidsjs/core/hooks';
import {getDefaultAvatarUrl} from '../avatar';

function CardUser({ user, className }: any) {
	const bem = useBem('card-user');
	const avatarUrl = user?.avatar || user?.image || getDefaultAvatarUrl(user?.username || user?.id || 'user');

	return (
		<Link
			toRoute={ROUTE_USER}
			toRouteParams={{
				userId: user.id,
			}}
			className={bem(bem.block(), className)}>
			<img
				className={bem.element('image')}
				src={avatarUrl}
				alt={user?.username || 'User avatar'}
			/>
			<div className={bem.element('text')}>
				{user.username}
			</div>
		</Link>
	);
}

export default CardUser;
