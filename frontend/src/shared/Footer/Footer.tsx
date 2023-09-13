import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import './Footer.scss';
import {FaDiscord, FaVk} from 'react-icons/fa';
import {Icon} from '@steroidsjs/core/ui/content';
import {Link} from '@steroidsjs/core/ui/nav';

interface IFooterProps {
    className?: string,
}

function Footer(props: IFooterProps) {
    const bem = useBem('Footer');

    return (
        <footer className={bem(bem.block(), props.className)}>
            <div>
                <h2 className={bem.element('siteName')}>HypeHub</h2>
                <p className={bem.element('email')}>info@hypehub.ru</p>
                <p className={bem.element('date')}>
                    {`2020-${(new Date()).getFullYear()}`}
                </p>
            </div>
            <div className={bem.element('social-block')}>
                <p>{__('Следите за нами в социальных сетях, чтобы оставаться в курсе последних событий!')}</p>
                <Link
                    className={bem.element('social-link')}
                    href='https://vk.com/interests_fun'>
                    <FaVk className={bem.element('icon')} />
                </Link>
                <Link
                    className={bem.element('social-link')}
                    href='https://discord.gg/wXkUF5tKee'>
                    <FaDiscord className={bem.element('icon')} />
                </Link>
            </div>
            <div className={bem.element('social-block')}>
                <p>{__('Сайт был разработан при поддержке')}</p>
                <Link
                    className={bem.element('rawg-logo')}
                    href='https://rawg.io/'>
                    <div className={bem.element('icon')}>
                        RAWG
                    </div>
                </Link>
                <Link href='https://www.themoviedb.org/'>
                    <Icon
                        name={'tmdbLogo'}
                        className={bem.element('tmdbLogo')}
                    />
                </Link>
            </div>
        </footer>
    );
}

export default Footer;
