import React from "react";
import classnames from "classnames";
import { useHistory } from "react-router-dom";
import "./card-user.sass";

function CardUser({ user, className }) {
	let history = useHistory();

	return (
		<a
			href={window.location.origin + "/user/" + user.id}
			onClick={(e) => {
				history.push("/user/" + user.id);
				e.preventDefault();
			}}
			className={classnames("card-user", className)}>
			<div className='card-user__image' style={{ backgroundImage: `url(${"https://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }} />
			<div className='card-user__text'>{user.username}</div>
		</a>
	);
}

export default CardUser;
