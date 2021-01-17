import React, { useEffect } from "react";
import { useHistory } from "react-router-dom";

function CardUser({ user }) {
	let history = useHistory();

	useEffect(() => {}, [user]);

	return (
		<a
			href={window.location.origin + "/user/" + user.id}
			onClick={(e) => {
				history.push("/user/" + user.id);
				e.preventDefault();
			}}>
			<div className='cardUser'>
				<div className='cardUserImage' style={{ backgroundImage: `url(${"http://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }}>
					{" "}
				</div>
				<div className='cardUserText'>
					<h4>{user.username}</h4>
				</div>
			</div>
		</a>
	);
}

export default CardUser;
