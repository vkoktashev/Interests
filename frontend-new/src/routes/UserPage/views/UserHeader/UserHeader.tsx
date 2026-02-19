import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {getDefaultAvatarUrl} from '../../../../shared/avatar';
import './user-header.scss';

interface IUserHeaderProps {
	user: any,
	lastActivity: string,
	isCurrentUser: boolean,
	onToggleFollow: () => void,
}

export function UserHeader(props: IUserHeaderProps) {
	const bem = useBem('user-header');
	const {user, lastActivity, isCurrentUser, onToggleFollow} = props;
	const totalItems = (user?.games?.length || 0) + (user?.movies?.length || 0) + (user?.shows?.length || 0);
	const defaultAvatarUrl = getDefaultAvatarUrl(user?.username || user?.id || 'user');
	const avatarUrl = user?.avatar || user?.image || defaultAvatarUrl;

	return (
		<div className={bem.block()}>
			<div className={bem.element('main')}>
				<img
					className={bem.element('avatar')}
					src={avatarUrl}
					alt={user?.username || 'User avatar'}
				/>

				<div className={bem.element('meta')}>
					<div className={bem.element('title-row')}>
						<h2 className={bem.element('username')}>
							{user?.username}
						</h2>
						<span hidden={user?.is_available} className={bem.element('status', {private: true})}>
							{__('Приватный профиль')}
						</span>
					</div>

					<div hidden={!user?.is_available} className={bem.element('last-activity')}>
						<span className={bem.element('activity-dot')} />
						<span className={bem.element('activity-label')}>
							{__('Последняя активность')}
						</span>
						<span className={bem.element('activity-value')}>
							{lastActivity}
						</span>
					</div>

					<div className={bem.element('stats')}>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-label')}>{__('Записей')}</span>
							<span className={bem.element('stat-value')}>{totalItems}</span>
						</div>
						<div className={bem.element('stat')}>
							<span className={bem.element('stat-label')}>{__('Друзей')}</span>
							<span className={bem.element('stat-value')}>{user?.followed_users?.length || 0}</span>
						</div>
					</div>
				</div>
			</div>

			<button
				hidden={isCurrentUser || !user?.is_available}
				className={bem.element('subscribe-button')}
				onClick={onToggleFollow}
			>
				{user?.is_followed ? __('Отписаться') : __('Подписаться')}
			</button>
		</div>
	);
}

export default UserHeader;
