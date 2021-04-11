import React, { useEffect, useState } from "react";
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
		<div className='contentPage'>
			<div className='bg' />
			<div className='contentBody header'>
				<div className='notFound'>
					<p style={{ fontSize: "3rem" }}>Страница не найдена!</p>
					<div style={{ transform: `rotate(${angle}deg)` }}>
						<img src='images/wrongPage.png' alt='Картинка' style={{ width: "500px", maxWidth: "80%" }} />
					</div>
				</div>
			</div>
		</div>
	);
}

export default NotFoundPage;
