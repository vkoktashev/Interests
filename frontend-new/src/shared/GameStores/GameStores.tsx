import * as React from 'react';
import './GameStores.scss';
import {IGameStoreItem} from '../../interfaces/IGameStore';
import {GameStoresEnum} from '../../enums/GameStoresEnum';
import {useBem} from '@steroidsjs/core/hooks';

interface IGameStoresProps {
    className?: string,
    stores: IGameStoreItem[],
}

function GameStores(props: IGameStoresProps) {
    const bem = useBem('GameStores');

    const renderStoreName = (props: {name: string}) => (
        <span>
            {props.name}
        </span>
    )

    const renderStore = (store: IGameStoreItem) => {
        const StoreIcon = GameStoresEnum.getIcon(store.store.slug) || renderStoreName;
        return (
            <a
                key={store.url}
                href={store.url}
                className={bem('store-link')}
                title={store.store.name}
                target="_blank"
            >
                <StoreIcon
                    className={bem('store-icon')}
                    name={store.store.name}
                />
            </a>
        )
    }

    if (!props.stores || !(props.stores.length > 0)) {
        return null;
    }

    return (
        <div className={bem(bem.block(), props.className)}>
            <p className={bem.element('label')}>
                Магазины:
            </p>
            {
                props.stores?.map(renderStore)
            }
        </div>
    );
}

export default GameStores;
