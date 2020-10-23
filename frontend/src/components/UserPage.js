import React, {
    useEffect,
    useState
} from "react";
import {
    useParams,
    useHistory
} from "react-router-dom";


/**
 * Основная страница приложения
 */
function UserPage () 
{
    let { user_id } = useParams();

    useEffect(
		() => {
            console.log(user_id);
		},
		[user_id]
    );

    return (
			<div>
				<h1>Страница ещё не готова</h1>
			</div>
    	);
}

export default UserPage;