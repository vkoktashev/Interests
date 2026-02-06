import React from "react";
import image from "./wrongPage.png";
import "./not-found-page.scss";

/**
 * Основная страница приложения
 */
function NotFoundPage() {
	return (
		<div className='not-found-page'>
			<div className='not-found-page__body'>
				<h1>Страница не найдена!</h1>
				<p className='not-found-page__description'>
					Похоже, такой страницы нет. Попробуйте вернуться на главную.
				</p>
				<div className='not-found-page__image-wrapper'>
					<img src={image} alt='Картинка' className='not-found-page__image' />
				</div>
				<a className='not-found-page__link' href='/'>
					На главную
				</a>
			</div>
		</div>
	);
}

export default NotFoundPage;
