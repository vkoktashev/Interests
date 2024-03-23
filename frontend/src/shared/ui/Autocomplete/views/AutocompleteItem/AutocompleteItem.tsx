import React from 'react';
import styles from './AutocompleteItem.module.scss';
import {IAutoCompleteItem} from '@/shared/ui/Autocomplete/Autocomplete';

export interface IAutocompleteItemProps {
    className?: string,
    item: IAutoCompleteItem,
}

function AutocompleteItem(props: IAutocompleteItemProps) {
    return (
        <div className={[styles.AutocompleteItem, props.className].join(' ')}>
            {props.item.label}
        </div>
    );
}

export default AutocompleteItem;
