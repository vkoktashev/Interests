import React, {useEffect, useRef} from 'react';
import styles from './AutocompleteItem.module.scss';
import {IAutoCompleteItem} from '@/shared/ui/Autocomplete/Autocomplete';

export interface IAutocompleteItemProps {
    className?: string,
    item: IAutoCompleteItem,
    isSelected: boolean,
    onHover: () => void,
    onClick: (item: IAutoCompleteItem) => void,
}

function AutocompleteItem(props: IAutocompleteItemProps) {
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
