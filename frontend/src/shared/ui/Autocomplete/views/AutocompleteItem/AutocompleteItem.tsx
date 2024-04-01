import React, {useEffect, useRef} from 'react';
import styles from './AutocompleteItem.module.scss';
import {IAutoCompleteItem} from '@/shared/ui/Autocomplete/Autocomplete';

export interface IAutocompleteItemProps<Item extends IAutoCompleteItem>{
    className?: string,
    item: Item,
    isSelected: boolean,
    onHover: () => void,
    onClick: (item: Item) => void,
}

function AutocompleteItem<Item extends IAutoCompleteItem>(props: IAutocompleteItemProps<Item>) {
    return (
        <button
                className={[
                styles.AutocompleteItem,
                props.className,
                props.isSelected && styles.selected,
            ].filter(Boolean).join(' ')}
            onMouseEnter={props.onHover}
                onKeyDown={(e) => {
                    e.preventDefault();
                    props.onClick(props.item);
                }}
            onClick={(e) => {
                e.stopPropagation();
                props.onClick(props.item);
            }}
        >
            {props.item.label}
        </button>
    );
}

export default AutocompleteItem;
