import React from "react";
import { observer } from "mobx-react";
import AuthStore from "../store/AuthStore";

/**
 * Основная страница приложения
 */
const HomePage = observer((props) => {
	const { user } = AuthStore;

	return (
		<div>
			<div className='bg textureBG' />
			<div className='contentPage'>
				<div className='contentBody header'>
					<h2>Добро пожаловать на Interests!</h2>
					<h4>
						Главная страница ещё не готова, однако можно воспользоваться <a href='/search/example'>поиском</a> или проверить свой <a href={"/user/" + user.id}>профиль</a>, если вы уже
						зарегистрированы
					</h4>
					<img src='images/logo192.png' style={{ marginLeft: "20px" }} alt='Картинка' />
				</div>
			</div>
		</div>
	);
});

export default HomePage;
