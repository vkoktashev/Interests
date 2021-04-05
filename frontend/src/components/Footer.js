import React from "react";
import { MDBIcon } from "mdbreact";

function Footer() {
	return (
		<div className='footer'>
			<div>
				<h2 className='footerName'>Interests</h2>
				2020-2021
			</div>
			<div className='socialBlock'>
				<p>Следите за нами в социальных сетях, чтобы оставаться в курсе последних событий!</p>
				<a href='https://vk.com/interests_fun' className='footerSocialLink'>
					<MDBIcon fab icon='vk' />
				</a>
				<a href='https://discord.gg/wXkUF5tKee' className='footerSocialLink'>
					<MDBIcon fab icon='discord' />
				</a>
			</div>
			<div className='socialBlock'>
				<h5>Сайт был разработан при поддержке</h5>
				<a href='https://rawg.io/' className='rawgLogo'>
					RAWG
				</a>
				<a href='https://www.themoviedb.org/'>
					<div className='tmdbLogo' />
				</a>
			</div>
		</div>
	);
}

export default Footer;
