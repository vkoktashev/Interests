import React from "react";
import { useHistory } from "react-router-dom";

function CardUser({ user }) {
	let history = useHistory();

	return (
		<a
			href={window.location.origin + "/user/" + user.id}
			onClick={(e) => {
				history.push("/user/" + user.id);
				e.preventDefault();
			}}
			className='cardUser'>
			<div className='cardUserImage' style={{ backgroundImage: `url(${"https://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }} />
			<div className='cardUserText'>
				<h4>{user.username}</h4>
			</div>
		</a>
	);
}

export default CardUser;
