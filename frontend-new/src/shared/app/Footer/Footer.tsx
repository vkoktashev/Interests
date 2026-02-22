import React from "react";
import { FaVk, FaDiscord } from "react-icons/fa";
import classnames from "classnames";
import "./footer.scss";
import {Icon} from '@steroidsjs/core/ui/content';
import {useBem} from '@steroidsjs/core/hooks';

function Footer({ className }: any) {
	const bem = useBem('footer');
	const currentYear = new Date().getFullYear();

	const socialLinks = [
		{
			key: 'vk',
			label: 'VK',
			href: 'https://vk.com/interests_fun',
			icon: <FaVk />,
		},
		{
			key: 'discord',
			label: 'Discord',
			href: 'https://discord.gg/wXkUF5tKee',
			icon: <FaDiscord />,
		},
	];

	const navLinks = [
		{key: 'search', label: 'Поиск', href: '/search'},
		{key: 'calendar', label: 'Календарь', href: '/calendar'},
		{key: 'unwatched', label: 'Непросмотренное', href: '/unwatched'},
		{key: 'faq', label: 'FAQ', href: '/faq'},
	];

	return (
		<footer className={classnames(bem.block(), className)}>
			<div className={bem.element('body')}>
				<div className={bem.element('brand')}>
					<div className={bem.element('brand-badge')}>Interests</div>
					<h2 className={bem.element('name')}>Личная медиатека</h2>
					<p className={bem.element('email')}>
						<a href='mailto:info@your-interests.ru'>info@your-interests.ru</a>
					</p>
				</div>

				<div className={bem.element('column')}>
					<h3 className={bem.element('title')}>Навигация</h3>
					<nav className={bem.element('links')} aria-label='Footer navigation'>
						{navLinks.map(link => (
							<a key={link.key} href={link.href} className={bem.element('link')}>
								{link.label}
							</a>
						))}
					</nav>
				</div>

				<div className={bem.element('column')}>
					<h3 className={bem.element('title')}>Сообщество</h3>
					<p className={bem.element('muted')}>
						Следите за обновлениями и обсуждайте новинки с другими пользователями.
					</p>
					<div className={bem.element('socials')}>
						{socialLinks.map(link => (
							<a
								key={link.key}
								href={link.href}
								className={bem.element('social-link')}
								aria-label={link.label}
								title={link.label}
								target='_blank'
								rel='noreferrer'
							>
								{link.icon}
							</a>
						))}
					</div>
				</div>

				<div className={bem.element('column')}>
					<h3 className={bem.element('title')}>Источники данных</h3>
					<p className={bem.element('muted')}>
						Часть данных о тайтлах и постерах предоставляется внешними сервисами.
					</p>
					<div className={bem.element('partners')}>
						<a href='https://rawg.io/' className={bem.element('rawg-logo')} target='_blank' rel='noreferrer'>
							RAWG
						</a>
						<a href='https://www.themoviedb.org/' className={bem.element('tmdb-link')} target='_blank' rel='noreferrer'>
							<Icon
								className={bem.element('tmdb-logo')}
								name='tmdbLogo'
							/>
						</a>
					</div>
				</div>
			</div>

			<div className={bem.element('bottom')}>
				<div className={bem.element('copyright')}>
					{`© 2020-${currentYear} Interests`}
				</div>
				<div className={bem.element('bottom-note')}>
					Создано для удобного учета фильмов, сериалов и игр
				</div>
			</div>
		</footer>
	);
}

export default Footer;
