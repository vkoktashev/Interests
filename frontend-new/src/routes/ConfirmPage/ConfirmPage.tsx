import React, {useEffect, useState} from 'react';
import {useComponents} from '@steroidsjs/core/hooks';
import "./confirm-page.scss";

/**
 * Основная страница приложения
 */
function ConfirmPage() {
	const {http} = useComponents();
	const [status, setStatus] = useState('');
	let search = window.location.search;
	let params = new URLSearchParams(search);
	let uid64 = params.get("uid64");
	let token = params.get("token");

	useEffect(() => {
		setStatus('pending');
			http.send(
				'PATCH',
				'/users/auth/confirm_email/',
				{uid64, token}
			)
				.then(() => setStatus('done'))
				.catch(() => setStatus('error'));
		},[]);

	return (
		<div className='confirm-page'>
			<h2 hidden={status !== "pending"} className='confirm-page__success'>
				Загрузка...
			</h2>
			<h2 hidden={status !== "done"} className='confirm-page__success'>
				Ваша почта подтверждена!
			</h2>
			<h2 hidden={status !== "error"} className='confirm-page__success'>
				Произошла ошибка. Не удалось подтвердить вашу почту
			</h2>
		</div>
	);
}

export default ConfirmPage;
