import React from "react";
import { useHistory } from "react-router-dom";
import Rating from "react-rating";
import { MDBIcon } from "mdbreact";
import classnames from "classnames";
import "./friends-activity.sass";

function FriendActivity({ info, className }) {
	let history = useHistory();

	return (
		<div className={classnames("friend-activity", className)}>
			<h5 className='friend-activity__user'>
				<a
					href={window.location.origin + "/user/" + info.user.id}
					onClick={(e) => {
						history.push("/user/" + info.user.id);
						e.preventDefault();
					}}>
					{info.user.username}
				</a>
			</h5>
			<div className='friend-activity__info'>
				<Rating
					stop={10}
					emptySymbol={<MDBIcon far icon='star' size='1x' />}
					fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
						<MDBIcon icon='star' size='1x' title={n} />
					))}
					initialRating={info.score}
					className='friend-activity__info-text'
					readonly={true}
				/>
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

export default FriendActivity;
