import React from 'react';
import classnames from 'classnames';
import {useBem, useDispatch} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import Rating from '../../../Rating';
import {getDefaultAvatarUrl} from '../../../avatar';
import {ROUTE_USER} from '../../../../routes';
import './friend-activity.scss';

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

interface IFriendActivityProps {
	info: IFriendActivityInfo,
	className?: string,
}

export function FriendActivity({info, className}: IFriendActivityProps) {
	const bem = useBem('friend-activity');
	const dispatch = useDispatch();
	const avatarUrl = info?.user?.avatar || info?.user?.image || getDefaultAvatarUrl(info?.user?.username || info?.user?.id || 'user');
	const hasReview = Boolean(info?.review?.trim());
	const hasSpentTime = typeof info?.spent_time === 'number' && info.spent_time > 0;
	const hasScore = typeof info?.score === 'number' && info.score > 0;
	const userHref = window.location.origin + '/user/' + info.user.id;

	const handleUserClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		dispatch(goToRoute(ROUTE_USER, {
			userId: info.user.id,
		}));
		e.preventDefault();
	};

	return (
		<div className={classnames(bem.block(), className)}>
			<div className={bem.element('header')}>
				<a
					className={bem.element('avatar-link')}
					href={userHref}
					onClick={handleUserClick}
				>
					<img
						className={bem.element('avatar')}
						src={avatarUrl}
						alt={info.user.username || 'User avatar'}
					/>
				</a>

				<div className={bem.element('header-meta')}>
					<h5 className={bem.element('user')}>
						<a
							className={bem.element('user-link')}
							href={userHref}
							onClick={handleUserClick}
						>
							{info.user.username}
						</a>
					</h5>
					{Boolean(info.status) && (
						<p className={bem.element('status')}>
							<span className={bem.element('label')}>Статус</span>
							<span className={bem.element('value')}>{info.status}</span>
						</p>
					)}
				</div>
			</div>

			<div className={bem.element('content')}>
				{hasScore && (
					<div className={bem.element('rating')}>
						<Rating initialRating={info.score || 0} readonly={true} />
					</div>
				)}

				{hasSpentTime && (
					<p className={bem.element('meta-row')}>
						<span className={bem.element('label')}>Время прохождения</span>
						<span className={bem.element('value')}>
							{info.spent_time} {intToHours(info.spent_time || 0)}
						</span>
					</p>
				)}

				{hasReview && (
					<div className={bem.element('review')}>
						<p className={bem.element('review-text')}>{info.review}</p>
					</div>
				)}
			</div>
		</div>
	);
}

function intToHours(number) {
	if (11 <= number && number <= 14) return "часов";
	else if (number % 10 === 1) return "час";
	else if (2 <= number % 10 && number % 10 <= 4) return "часа";
	else return "часов";
}
