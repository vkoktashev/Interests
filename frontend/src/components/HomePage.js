import React from "react";

import LoginForm from "./LoginForm";
import RegistrationForm from "./RegistrationForm";
import Navbar from "./Navbar";

/**
 * Основная страница приложения
 */
function HomePage () 
{
    return (
			<div>
				<Navbar />
				<LoginForm/>
				<RegistrationForm/>
			</div>
    	);
}

export default HomePage;