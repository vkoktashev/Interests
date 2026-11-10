import React, {useCallback, useEffect, useState} from 'react';
import {useBem, useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {Button} from '@steroidsjs/core/ui/form';

export interface ITelegramLinkStatus {
	is_available: boolean,
	is_linked: boolean,
	telegram_username: string | null,
}

interface ITelegramIntegrationProps {
	status: ITelegramLinkStatus | null,
	onStatusRefresh: () => any,
}

interface IPendingLink {
	url: string,
	expiresAt: number,
}

const STATUS_POLL_INTERVAL_MS = 3000;

function TelegramIntegration(props: ITelegramIntegrationProps) {
	const bem = useBem('settings-page');
	const {http} = useComponents();
	const dispatch = useDispatch();
	const [pendingLink, setPendingLink] = useState<IPendingLink | null>(null);
	const [isActionLoading, setActionLoading] = useState(false);
	const isLinked = !!props.status?.is_linked;

	useEffect(() => {
		if (!pendingLink) {
			return undefined;
		}
		if (isLinked) {
			setPendingLink(null);
			dispatch(showNotification('Telegram подключён!'));
			return undefined;
		}
		const timer = window.setInterval(() => {
			if (Date.now() > pendingLink.expiresAt) {
				setPendingLink(null);
				return;
			}
			props.onStatusRefresh();
		}, STATUS_POLL_INTERVAL_MS);
		return () => window.clearInterval(timer);
	}, [dispatch, isLinked, pendingLink, props.onStatusRefresh]);

	const onLink = useCallback(async () => {
		// Open the tab synchronously so the browser does not treat it as an unwanted popup.
		const popup = window.open('', '_blank');
		if (popup) {
			popup.opener = null;
		}
		setActionLoading(true);
		try {
			const response = await http.post('/users/auth/telegram_link/');
			setPendingLink({
				url: response.url,
				expiresAt: Date.now() + response.expires_in * 1000,
			});
			if (popup) {
				popup.location.href = response.url;
			}
		} catch (e) {
			popup?.close();
			const errorMessage = e?.response?.data?.error || 'Не удалось получить ссылку на Telegram бота';
			dispatch(showNotification(errorMessage, 'error'));
		} finally {
			setActionLoading(false);
		}
	}, [dispatch, http]);

	const onUnlink = useCallback(async () => {
		setActionLoading(true);
		try {
			await http.send('DELETE', '/users/auth/telegram_unlink/');
			await props.onStatusRefresh();
			dispatch(showNotification('Telegram отвязан.'));
		} catch (e) {
			const errorMessage = e?.response?.data?.error || 'Не удалось отвязать Telegram';
			dispatch(showNotification(errorMessage, 'error'));
		} finally {
			setActionLoading(false);
		}
	}, [dispatch, http, props.onStatusRefresh]);

	if (!props.status?.is_available) {
		return null;
	}

	let subtitle = 'Подключите Telegram, чтобы получать уведомления о релизах в боте';
	if (isLinked) {
		subtitle = `Привязан: ${props.status.telegram_username ? `@${props.status.telegram_username}` : 'Telegram аккаунт'}`;
	} else if (pendingLink) {
		subtitle = 'Откройте бота и нажмите «Запустить». Ссылка действует 10 минут.';
	}

	return (
		<div className={bem.element('integration-card', {linked: isLinked})}>
			<div className={bem.element('integration-header')}>
				<div>
					<div className={bem.element('integration-title')}>Telegram</div>
					<div className={bem.element('integration-subtitle')}>
						{subtitle}
					</div>
				</div>
				<div className={bem.element('integration-badge', {linked: isLinked})}>
					{isLinked ? 'Подключен' : 'Не подключен'}
				</div>
			</div>

			<div className={bem.element('integration-actions')}>
				{isLinked && (
					<Button
						type='button'
						outline
						color='danger'
						className={bem.element('unlink-button')}
						disabled={isActionLoading}
						label={isActionLoading ? 'Отвязка...' : 'Отвязать Telegram'}
						onClick={onUnlink}
					/>
				)}
				{!isLinked && !pendingLink && (
					<Button
						type='button'
						disabled={isActionLoading}
						label={isActionLoading ? 'Подготовка...' : 'Подключить Telegram'}
						onClick={onLink}
					/>
				)}
				{!isLinked && pendingLink && (
					<>
						<Button
							type='button'
							label='Открыть Telegram'
							onClick={() => window.open(pendingLink.url, '_blank', 'noopener')}
						/>
						<Button
							type='button'
							outline
							label='Отмена'
							onClick={() => setPendingLink(null)}
						/>
					</>
				)}
			</div>
		</div>
	);
}

export default TelegramIntegration;
