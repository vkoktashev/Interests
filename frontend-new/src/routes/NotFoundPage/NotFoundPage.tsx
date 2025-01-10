import React, { useEffect, useState } from "react";
import image from "./wrongPage.png";
import "./not-found-page.scss";
/**
 * Основная страница приложения
 */
function NotFoundPage() {
	const [angle, setAngle] = useState(0);

	useEffect(
		() => {
			window.requestAnimationFrame(() => setAngle(angle + 1));
		},
		// eslint-disable-next-line
		[angle]
	);

	return (
		<div className='not-found-page'>
			<div className='not-found-page__body'>
				<h1>Страница не найдена!</h1>
				<div style={{ transform: `rotate(${angle}deg)` }}>
					<img src={image} alt='Картинка' className='not-found-page__image' />
				</div>
			</div>
		</div>
	);
}

export default NotFoundPage;
