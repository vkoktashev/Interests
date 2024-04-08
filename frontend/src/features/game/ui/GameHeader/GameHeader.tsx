import React, {useMemo} from 'react';
import {Rate, Segmented, theme} from 'antd';
import Image from 'next/image';
import Typography from 'antd/es/typography';
import styled from 'styled-components';
import {GlobalToken} from 'antd/es/theme/interface';
import Link from 'next/link';
import {IGame, IGameInStore} from '@/entities/game/model/interfaces';
import {GameStoresEnum} from '@/entities/game/model/GameStoreEnum';

interface IGameHeaderProps {
    game?: IGame,
}

const {useToken} = theme;

const StyledMain = styled.div<{ $token: GlobalToken, }>`
    flex: 0;
    display: flex;
    flex-direction: row;
    background-color: ${props => props.$token.colorBgContainer};
`;

const InfoBlock = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
`;

const Stores = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
    margin-bottom: 10px;
`;

const IconWrapper = styled.span<{ $token: GlobalToken, }>`
    svg {
      width: ${props => props.$token.sizeLG}px;
      fill: ${props => props.$token.colorText};
      transition: fill .5s ease;
    }
    svg:hover {
      fill: ${props => props.$token.colorPrimary};
    }
`;

function GameHeader(props: IGameHeaderProps) {
    const {token} = useToken();
    const {game} = props;

    const infoItems = useMemo(() => ([
        {
            label: 'Разработчики',
            value: game?.developers,
        },
        {
            label: 'Дата релиза',
            value: game?.release_date,
        },
        {
            label: 'Жанр',
            value: game?.genres,
        },
        {
            label: 'Платформы',
            value: game?.platforms,
        },
    ].filter(item => Boolean(item.value))), [game]);

    const renderStoreLink = (store: IGameInStore) => {
        const StoreIcon = GameStoresEnum.getIcon(store.store.slug);
        return (
            <Link
                href={store.url}
                key={store.id}
            >
                {StoreIcon && (
                    <IconWrapper $token={token}>
                        <StoreIcon />
                    </IconWrapper>
                )}
            </Link>
        );
    };

    return (
        <StyledMain $token={token}>
            <Image
                src={game?.poster as any}
                alt='game poster'
                width={480}
                height={270}
            />
            <div style={{padding: token.paddingMD}}>
                <Typography.Title>
                    {game?.name}
                </Typography.Title>
                <InfoBlock>
                    {
                        infoItems.map(item => (
                            <Typography.Text key={item.label}>
                                {`${item.label}: ${item.value}`}
                            </Typography.Text>
                        ))
                    }
                </InfoBlock>
                <Stores>
                    {game?.stores?.map(renderStoreLink)}
                </Stores>
                <Rate
                    allowClear
                    count={10}
                />
                <Segmented
                    options={[
                        {
                            label: 'Не играл',
                            value: 'Weekly',
                        },
                        {
                            label: 'Буду играть',
                            value: 'Weekly2',
                        },
                        {
                            label: 'Играю',
                            value: 'Weekly3',
                        },
                        {
                            label: 'Дропнул',
                            value: 'Weekly4',
                        },
                        {
                            label: 'Прошел',
                            value: 'Weekly5',
                        },
                    ]}
                />
            </div>
        </StyledMain>
    );
}

export default GameHeader;
