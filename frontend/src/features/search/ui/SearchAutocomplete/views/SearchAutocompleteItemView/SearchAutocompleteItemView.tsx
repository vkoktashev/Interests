import React from 'react';
import styles from './SearchAutocompleteItemView.module.scss';
import {IAutocompleteItemProps} from '@/shared/ui/Autocomplete/views/AutocompleteItem/AutocompleteItem';

interface ISearchAutocompleteItemView extends IAutocompleteItemProps {
    item: {
        id: string,
        label: string,
        categoryId?: string,
        year?: number,
    },
}

function SearchAutocompleteItemView(props: ISearchAutocompleteItemView) {
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
            <span>
                {props.item.label}
            </span>
            <span>
                {props.item.year || ''}
            </span>
        </button>
    );
}

export default SearchAutocompleteItemView;
