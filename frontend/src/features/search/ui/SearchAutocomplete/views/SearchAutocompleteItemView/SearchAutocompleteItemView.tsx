import React from 'react';
import styles from './SearchAutocompleteItemView.module.scss';
import {IAutocompleteItemProps} from '@/shared/ui/Autocomplete/views/AutocompleteItem/AutocompleteItem';
import Link from 'next/link';
import {ISearchAutocompleteItem} from '@/features/search/ui/SearchAutocomplete/SearchAutocomplete';

interface ISearchAutocompleteItemView extends IAutocompleteItemProps<ISearchAutocompleteItem> {
    item: ISearchAutocompleteItem,
}

function SearchAutocompleteItemView(props: ISearchAutocompleteItemView) {
    return (
        <Link
            className={[
                styles.AutocompleteItem,
                props.className,
                props.isSelected && styles.selected,
            ].filter(Boolean).join(' ')}
            href={props.item.href}
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
        </Link>
    );
}

export default SearchAutocompleteItemView;
