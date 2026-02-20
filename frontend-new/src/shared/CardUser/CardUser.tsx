import React from "react";
import "./card-user.scss";
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_USER} from '../../routes';
import {useBem} from '@steroidsjs/core/hooks';
import {getDefaultAvatarUrl} from '../avatar';

interface IUserCard {
	id: number | string;
	username?: string;
	avatar?: string;
	image?: string;
}

interface ICardUserProps {
	user: IUserCard;
	className?: string;
}

function CardUser({ user, className }: ICardUserProps) {
	const bem = useBem('card-user');
	const username = user?.username || 'Пользователь';
	const avatarUrl = user?.avatar || user?.image || getDefaultAvatarUrl(username || user?.id || 'user');

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
				alt={username}
				loading='lazy'
			/>
			<div className={bem.element('body')}>
				<div className={bem.element('text')}>
					{username}
				</div>
			</div>
		</Link>
	);
}

export default CardUser;
