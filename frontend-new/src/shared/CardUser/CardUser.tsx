import React from "react";
import "./card-user.scss";
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_USER} from '../../routes';
import {useBem} from '@steroidsjs/core/hooks';

function CardUser({ user, className }: any) {
	const bem = useBem('card-user');

	return (
		<Link
			toRoute={ROUTE_USER}
			toRouteParams={{
				userId: user.id,
			}}
			className={bem(bem.block(), className)}>
			<div
				className={bem.element('image')}
				style={{ backgroundImage: `url(${"https://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }}
			/>
			<div className={bem.element('text')}>
				{user.username}
			</div>
		</Link>
	);
}

export default CardUser;
