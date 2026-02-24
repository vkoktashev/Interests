import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import './google-sign-in-button.scss';

declare global {
	interface Window {
		google?: any,
	}
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('No window'));
	}

	if (window.google?.accounts?.id) {
		return Promise.resolve();
	}

	if (!googleScriptPromise) {
		googleScriptPromise = new Promise((resolve, reject) => {
			const existing = document.querySelector('script[data-google-identity="1"]') as HTMLScriptElement | null;
			if (existing) {
				existing.addEventListener('load', () => resolve(), {once: true});
				existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), {once: true});
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://accounts.google.com/gsi/client';
			script.async = true;
			script.defer = true;
			script.dataset.googleIdentity = '1';
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Google script'));
			document.head.appendChild(script);
		});
	}

	return googleScriptPromise;
}

type TGoogleSignInButtonProps = {
	className?: string,
	clientId?: string,
	disabled?: boolean,
	onCredential: (credential: string) => void | Promise<void>,
	onError?: (message: string) => void,
};

function GoogleSignInButton(props: TGoogleSignInButtonProps) {
	const bem = useBem('google-sign-in-button');
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [isScriptReady, setScriptReady] = useState(false);

	const clientId = useMemo(
		() => props.clientId || process.env.REACT_APP_GOOGLE_CLIENT_ID,
		[props.clientId],
	);

	useEffect(() => {
		if (!clientId) {
			return;
		}

		let isMounted = true;
		loadGoogleScript()
			.then(() => {
				if (!isMounted) {
					return;
				}
				setScriptReady(true);
			})
			.catch(() => {
				if (!isMounted) {
					return;
				}
				props.onError?.(__('Не удалось загрузить Google Sign-In'));
			});

		return () => {
			isMounted = false;
		};
	}, [clientId, props]);

	useEffect(() => {
		if (!isScriptReady || !clientId || !containerRef.current || !window.google?.accounts?.id) {
			return;
		}

		const googleId = window.google.accounts.id;
		containerRef.current.innerHTML = '';

		googleId.initialize({
			client_id: clientId,
			callback: (response: { credential?: string }) => {
				if (!response?.credential) {
					props.onError?.(__('Google не вернул токен авторизации'));
					return;
				}
				props.onCredential(response.credential);
			},
			auto_select: false,
			cancel_on_tap_outside: true,
		});

		googleId.renderButton(containerRef.current, {
			theme: 'outline',
			size: 'large',
			type: 'standard',
			shape: 'pill',
			text: 'continue_with',
			logo_alignment: 'left',
			width: '320',
		});
	}, [clientId, isScriptReady, props]);

	if (!clientId) {
		return null;
	}

	return (
		<div className={bem(bem.block({disabled: !!props.disabled}), props.className)}>
			<div className={bem.element('divider')}>
				<span className={bem.element('divider-text')}>{__('или')}</span>
			</div>
			<div className={bem.element('button-wrap')}>
				<div ref={containerRef} className={bem.element('button-host')} />
				{props.disabled && <div className={bem.element('overlay')} />}
			</div>
		</div>
	);
}

export default GoogleSignInButton;
