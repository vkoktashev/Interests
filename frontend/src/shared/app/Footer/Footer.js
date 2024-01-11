import React from "react";
import { FaVk, FaDiscord } from "react-icons/fa";
import classnames from "classnames";
import "./footer.sass";
import tmdbLogo from './tmdb-logo.svg';

function Footer({ className }) {
	return (
		<div className={classnames("footer", className)}>
			<div className='footer__body'>
				<div>
					<h2 className='footer__name'>Interests</h2>
					<p className='footer__email'>info@your-interests.ru</p>
					<p className='footer__date'>
						{`2020-${(new Date()).getFullYear()}`}
					</p>
				</div>
				<div className='footer__social-block'>
					<p>Следите за нами в социальных сетях, чтобы оставаться в курсе последних событий!</p>
					<a href='https://vk.com/interests_fun' className='footer__social-link'>
						<FaVk />
					</a>
					<a href='https://discord.gg/wXkUF5tKee' className='footer__social-link'>
						<FaDiscord />
					</a>
				</div>
				<div className='footer__social-block'>
					<p>Сайт был разработан при поддержке</p>
					<a href='https://rawg.io/' className='footer__rawg-logo'>
						RAWG
					</a>
					<a href='https://www.themoviedb.org/'>
						<img
							className='footer__tmdb-logo'
							src={tmdbLogo}
						/>
					</a>
				</div>
			</div>
		</div>
	);
}

export default Footer;
