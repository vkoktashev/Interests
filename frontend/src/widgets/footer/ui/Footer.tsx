import React from 'react';
import Link from 'next/link';
import DiscordIcon from '@/../public/icons/discord.svg';
import VKIcon from '@/../public/icons/vk.svg';
import TMDBIcon from '@/../public/icons/tmdb.svg';
import styles from './Footer.module.scss';

interface IFooterProps {
    className?: string,
}

function Footer(props: IFooterProps) {
    return (
        <div className={[styles.Footer, props.className].join(' ')}>
            <div className={[styles.block, styles.leftBlock].join(' ')}>
                <h4 className={styles.name}>
                    Interests
                </h4>
                <span>
                    info@your-interests.ru
                </span>
                <span>
                    {`2020-${new Date().getFullYear()}`}
                </span>
            </div>
            <div className={styles.block}>
                <span className={styles.subheader}>
                    Следите за нами в социальных сетях, чтобы оставаться в курсе последних событий
                </span>
                <div className={styles.links}>
                    <Link href={'https://discord.gg/wXkUF5tKee'} className={styles.link}>
                        <DiscordIcon className={styles.icon} />
                    </Link>
                    <Link href={'https://vk.com/interests_fun'} className={styles.link}>
                        <VKIcon className={styles.icon} />
                    </Link>
                </div>
            </div>
            <div className={styles.block}>
                <span className={styles.subheader}>
                    Сайт был разработан с использованием
                </span>
                <div className={styles.links}>
                    <Link href={'https://discord.gg/wXkUF5tKee'} className={styles.rawg}>
                        RAWG
                    </Link>
                    <Link href={'https://www.themoviedb.org/'}>
                        <TMDBIcon className={styles.tmdb} />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Footer;
