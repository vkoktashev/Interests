import * as React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {GameStoresEnum} from '../../../../enums/GameStoresEnum';
import {IGamePriceItem} from '../../../../interfaces/IGamePrice';

interface IGamePricesProps {
    className?: string,
    isLoading?: boolean,
    prices: IGamePriceItem[],
}

export default function GamePrices(props: IGamePricesProps) {
    const bem = useBem('game-page');
    const prices = props.prices || [];

    if (!props.isLoading && prices.length === 0) {
        return null;
    }

    return (
        <div className={bem(bem.element('resource-group'), props.className)}>
            <div className={bem.element('resource-group-label')}>Цены</div>
            {props.isLoading ? (
                <div className={bem.element('prices-loading')}>
                    Загружаем цены Steam...
                </div>
            ) : (
                <div className={bem.element('prices-list')}>
                    {prices.map(price => {
                        const StoreIcon = GameStoresEnum.getIcon(price.store.slug);

                        return (
                            <a
                                key={`${price.store.slug}-${price.region}-${price.url}`}
                                href={price.url}
                                target='_blank'
                                rel='noreferrer'
                                className={bem.element('price-card', {[price.store.slug]: true})}
                                title={`${price.store.name}: ${price.formatted_final}`}
                            >
                                {StoreIcon && <StoreIcon className={bem.element('price-card-icon')} />}
                                <span className={bem.element('price-card-price')}>
                                    {price.formatted_final}
                                </span>
                                {price.discount_percent > 0 && (
                                    <span className={bem.element('price-card-discount')}>
                                        -{price.discount_percent}%
                                    </span>
                                )}
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
