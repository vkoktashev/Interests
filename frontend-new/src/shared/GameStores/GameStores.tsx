import * as React from 'react';
import './GameStores.scss';
import {IGameStoreItem} from '../../interfaces/IGameStore';
import {GameStoresEnum} from '../../enums/GameStoresEnum';
import {useBem} from '@steroidsjs/core/hooks';

interface IGameStoresProps {
    className?: string,
    stores: IGameStoreItem[],
    showLabel?: boolean,
}

function GameStores(props: IGameStoresProps) {
    const bem = useBem('GameStores');
    const showLabel = props.showLabel !== false;
    const stores = React.useMemo(() => [...(props.stores || [])].sort((firstStore, secondStore) => {
        const firstPriority = GameStoresEnum.PRIORITY.indexOf(firstStore.store.slug);
        const secondPriority = GameStoresEnum.PRIORITY.indexOf(secondStore.store.slug);
        if (firstPriority >= 0 && secondPriority >= 0) {
            return firstPriority - secondPriority;
        }
        if (firstPriority >= 0) {
            return -1;
        }
        if (secondPriority >= 0) {
            return 1;
        }
        return firstStore.store.name.localeCompare(secondStore.store.name);
    }), [props.stores]);

    const renderStoreName = (props: {name: string}) => (
        <span className={bem.element('store-fallback')}>
            {props.name}
        </span>
    );

    const renderStore = (store: IGameStoreItem) => {
        const StoreIcon = GameStoresEnum.getIcon(store.store.slug) || renderStoreName;
        return (
            <a
                key={store.url}
                href={store.url}
                className={bem.element('store-link', {[store.store.slug]: true})}
                title={store.store.name}
                target="_blank"
                rel='noreferrer'
            >
                <StoreIcon
                    className={bem.element('store-icon')}
                    name={store.store.name}
                />
            </a>
        );
    };

    if (stores.length === 0) {
        return null;
    }

    return (
        <div className={bem(bem.block(), props.className)}>
            {showLabel && (
                <p className={bem.element('label')}>
                    Магазины:
                </p>
            )}
            <div className={bem.element('list')}>
                {stores.map(renderStore)}
            </div>
        </div>
    );
}

export default GameStores;
