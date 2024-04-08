"use client";
import React from 'react';
import Link from 'next/link';
import DiscordIcon from '@/../public/icons/discord.svg';
import VKIcon from '@/../public/icons/vk.svg';
import TMDBIcon from '@/../public/icons/tmdb.svg';
import styles from './Footer.module.scss';
import {theme, Layout, GlobalToken} from 'antd';
import Typography from 'antd/es/typography';
import styled from 'styled-components';

interface IFooterProps {
    className?: string,
}

const {Footer: BaseFooter} = Layout;

const {useToken} = theme;

const StyledLink = styled(Link)<{ $token: GlobalToken }>`
  svg {
    width: 55px;
    fill: ${props => props.$token.colorText};
    transition: fill .5s ease;
  }
  svg:hover {
    fill: ${props => props.$token.colorPrimary};
  }
`;

const StyledTextLink = styled(Link)<{ $token: GlobalToken }>`
  transition: color .5s ease;
  color: ${props => props.$token.colorText};
  
  :hover {
    color: ${props => props.$token.colorPrimary};
  }
`;

function Footer(props: IFooterProps) {
    const { token } = useToken();

    return (
        <BaseFooter className={[styles.Footer, props.className].join(' ')} style={{backgroundColor: token.colorBgBase}}>
            <div className={[styles.block, styles.leftBlock].join(' ')}>
                <Typography.Title level={3} className={styles.name}>
                    Interests
                </Typography.Title>
                <Typography.Text>
                    info@your-interests.ru
                </Typography.Text>
                <Typography.Text>
                    {`2020-${new Date().getFullYear()}`}
                </Typography.Text>
            </div>
            <div className={styles.block}>
                <Typography.Text className={styles.subheader}>
                    Следите за нами в социальных сетях, чтобы оставаться в курсе последних событий
                </Typography.Text>
                <div className={styles.links}>
                    <StyledLink
                        href={'https://discord.gg/wXkUF5tKee'}
                        $token={token}
                    >
                        <DiscordIcon className={styles.icon} />
                    </StyledLink>
                    <StyledLink
                        href={'https://vk.com/interests_fun'}
                        $token={token}
                    >
                        <VKIcon className={styles.icon} />
                    </StyledLink>
                </div>
            </div>
            <div className={styles.block}>
                <Typography.Text className={styles.subheader}>
                    Сайт был разработан с использованием
                </Typography.Text>
                <div className={styles.links}>
                    <StyledTextLink
                        href={'https://discord.gg/wXkUF5tKee'}
                        className={styles.rawg}
                        $token={token}
                    >
                        RAWG
                    </StyledTextLink>
                    <Link href={'https://www.themoviedb.org/'}>
                        <TMDBIcon className={styles.tmdb} />
                    </Link>
                </div>
            </div>
        </BaseFooter>
    );
}

export default Footer;
