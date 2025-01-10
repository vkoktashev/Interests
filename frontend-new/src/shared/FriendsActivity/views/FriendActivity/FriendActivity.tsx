import React from "react";
import classnames from "classnames";
import Rating from '../../../Rating';
import "./friend-activity.scss";
import {useDispatch} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_USER} from '../../../../routes';

export function FriendActivity({ info, className }) {
	const dispatch = useDispatch();

	return (
		<div className={classnames("friend-activity", className)}>
			<h5 className='friend-activity__user'>
				<a
					href={window.location.origin + "/user/" + info.user.id}
					onClick={(e) => {
						dispatch(goToRoute(ROUTE_USER, {
							userId: info.user.id,
						}));
						e.preventDefault();
					}}>
					{info.user.username}
				</a>
			</h5>
			<div className='friend-activity__info'>
				<Rating initialRating={info.score} className='friend-activity__info-text' readonly={true} />
				<p className='friend-activity__info-text'>Статус: {info.status} </p>
				<p className='friend-activity__info-text' hidden={!info.spent_time}>
					Время проходения: {info.spent_time} {intToHours(info.spent_time)}
				</p>
				<p className='friend-activity__info-text' hidden={info.review === ""}>
					Отзыв: {info.review}
				</p>
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
