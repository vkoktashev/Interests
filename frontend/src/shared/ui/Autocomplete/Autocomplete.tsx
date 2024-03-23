import React, {useEffect, useState} from 'react';
import styles from './Autocomplete.module.scss';
import SearchIcon from '../../../../public/icons/search.svg';
import AutocompleteCategory from './views/AutocompleteCategory';
import {IAutocompleteCategoryProps} from '@/shared/ui/Autocomplete/views/AutocompleteCategory/AutocompleteCategory';
import AutocompleteItem from '@/shared/ui/Autocomplete/views/AutocompleteItem';
import {IAutocompleteItemProps} from '@/shared/ui/Autocomplete/views/AutocompleteItem/AutocompleteItem';

export type IAutoCompleteCategory = {
    id: string,
    label: string,
    icon?: React.ReactNode,
};

export type IAutoCompleteItem = {
    id: string,
    label: string,
    categoryId?: string,
};

interface IAutocompleteProps<Item extends IAutoCompleteItem> {
    items: Array<Item>,
    categories?: Array<IAutoCompleteCategory>
    onQueryChange: (query: string) => Promise<void> | void,
    className?: string,
    itemComponent?: React.FC<IAutocompleteItemProps>,
    categoryComponent?: React.FC<IAutocompleteCategoryProps>,
}

function Autocomplete<Item extends IAutoCompleteItem>(props: IAutocompleteProps<Item>) {
    const [isFocused, setFocused] = useState(false);
    const [value, setValue] = useState<string>('');

    useEffect(() => {
        props.onQueryChange(value);
    }, [value]);

    const Category = props.categoryComponent || AutocompleteCategory;
    const Item = props.itemComponent || AutocompleteItem;

    const renderItem = ((item: Item) => (
        <Item key={item.id} item={item} />
    ));

    return (
        <div className={[
            styles.Autocomplete,
            props.className,
            isFocused ? styles.focused : null,
        ].filter(Boolean).join(' ')}>
            <SearchIcon className={styles.icon} />
            <input
                className={styles.input}
                onChange={(e) => {
                    setValue(e.target.value);
                }}
                value={value}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder='Искать...'
            />
            {
                isFocused && (
                    <div className={styles.datalist}>
                        {props.categories?.length
                            ? props.categories.map(category => (
                                <Category key={category.id} category={category}>
                                    {props.items
                                        .filter(item => item.categoryId === category.id)
                                        .map(renderItem)}
                                </Category>
                            ))
                            : props.items.map(renderItem)}
                    </div>
                )
            }
        </div>
     );
}

export default Autocomplete;
