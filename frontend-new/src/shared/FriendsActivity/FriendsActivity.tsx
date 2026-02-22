import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import FriendActivity from './views/FriendActivity';

interface IFriendUser {
	id: number | string,
	username: string,
	avatar?: string,
	image?: string,
}

interface IFriendActivityInfo {
	user: IFriendUser,
	score?: number,
	status?: string,
	spent_time?: number,
	review?: string,
}

interface IFriendsActivityProps {
	info?: IFriendActivityInfo[],
}

export function FriendsActivity({info}: IFriendsActivityProps) {
	const bem = useBem('friends-activity');

	if (!info?.length) {
		return null;
	}

	return (
		<div className={bem.block()}>
			{info?.map((friendInfo) => (
				<FriendActivity
					info={friendInfo}
					key={friendInfo.user.id}
					className={bem.element('element')}
				/>
			))}
		</div>
	);
}
