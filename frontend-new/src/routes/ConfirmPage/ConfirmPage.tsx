import React, {useEffect, useMemo, useState} from 'react';
import {useBem, useComponents} from '@steroidsjs/core/hooks';
import {Button} from '@steroidsjs/core/ui/form';
import "./confirm-page.scss";
import {ROUTE_ROOT} from '../index';

/**
 * Основная страница приложения
 */
function ConfirmPage() {
	const bem = useBem('confirm-page');
	const {http} = useComponents();
	const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
	const params = useMemo(() => new URLSearchParams(window.location.search), []);
	const uid64 = params.get("uid64");
	const token = params.get("token");

	useEffect(() => {
		if (!uid64 || !token) {
			setStatus('error');
			return;
		}

		setStatus('pending');
		http.send(
			'PATCH',
			'/users/auth/confirm_email/',
			{uid64, token}
		)
			.then(() => setStatus('done'))
			.catch(() => setStatus('error'));
	}, [http, token, uid64]);

	const content = useMemo(() => {
		if (status === 'pending' || status === 'idle') {
			return {
				mod: 'pending',
				title: __('Подтверждаем почту'),
				text: __('Проверяем ссылку подтверждения. Это обычно занимает несколько секунд.'),
			};
		}

		if (status === 'done') {
			return {
				mod: 'done',
				title: __('Почта подтверждена'),
				text: __('Аккаунт активирован. Теперь можно вернуться в приложение и продолжить пользоваться Interests.'),
			};
		}

		return {
			mod: 'error',
			title: __('Не удалось подтвердить почту'),
			text: __('Ссылка подтверждения недействительна или устарела. Попробуйте запросить письмо повторно.'),
		};
	}, [status]);

	return (
		<div className={bem.block()}>
			<div className={bem.element('container')}>
				<div className={bem.element('card', {[content.mod]: true})}>
					<div className={bem.element('icon-wrap')}>
						<div className={bem.element('icon', {[content.mod]: true})}>
							{status === 'done' ? '✓' : status === 'error' ? '!' : '•'}
						</div>
					</div>

					<h1 className={bem.element('title')}>
						{content.title}
					</h1>
					<p className={bem.element('text')}>
						{content.text}
					</p>

					<div className={bem.element('actions')}>
						<Button
							tag='a'
							toRoute={ROUTE_ROOT}
							className={bem.element('button')}
							label={status === 'done' ? __('На главную') : __('Открыть главную')}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ConfirmPage;
