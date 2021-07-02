import React from "react";
import { MDBIcon } from "mdbreact";
import classnames from "classnames";
import "./footer.sass";

function Footer({ className }) {
	return (
		<div className={classnames("footer", className)}>
			<div className='footer__body'>
				<div>
					<h2 className='footer__name'>Interests</h2>
					<p>info@interests.fun</p>
					2020-2021
				</div>
				<div className='footer__social-block'>
					<p>Следите за нами в социальных сетях, чтобы оставаться в курсе последних событий!</p>
					<a href='https://vk.com/interests_fun' className='footer__social-link'>
						<MDBIcon fab icon='vk' />
					</a>
					<a href='https://discord.gg/wXkUF5tKee' className='footer__social-link'>
						<MDBIcon fab icon='discord' />
					</a>
				</div>
				<div className='footer__social-block'>
					<h5>Сайт был разработан при поддержке</h5>
					<a href='https://rawg.io/' className='footer__rawg-logo'>
						RAWG
					</a>
					<a href='https://www.themoviedb.org/'>
						<div className='footer__tmdb-logo' />
					</a>
				</div>
			</div>
		</div>
	);
}

export default Footer;
