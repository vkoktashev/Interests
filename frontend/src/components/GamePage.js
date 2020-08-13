import React from "react";

import LoginForm from "./LoginForm";
import Navbar from "./Navbar";

/**
 * Основная страница приложения
 */
function GamePage () 
{
    return (
			<div>
				<Navbar/>
				<LoginForm/>
			</div>
    	);
}

export default GamePage;