import React, { useEffect, useState } from "react";
import "./style.css";
/**
 * Основная страница приложения
 */
function NotFoundPage() {
	const [angle, setAngle] = useState(0);

	useEffect(
		() => {
			setTimeout(() => setAngle(angle + 1), 150);
		},
		// eslint-disable-next-line
		[angle]
	);

	return (
		<div className='bg'>
			<div className='notFound' style={{ transform: `rotate(${angle}deg)` }}>
				<p style={{ fontSize: "3rem" }}>Страница не найдена!</p>
				<img src='images/wrongPage.png' alt='Картинка' style={{ width: "500px" }} />
			</div>
		</div>
	);
}

export default NotFoundPage;
