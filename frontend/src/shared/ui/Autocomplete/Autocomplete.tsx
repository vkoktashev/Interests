import React, {KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useClickAway} from 'react-use';
import {IAutocompleteCategoryProps} from '@/shared/ui/Autocomplete/views/AutocompleteCategory/AutocompleteCategory';
import AutocompleteItem from '@/shared/ui/Autocomplete/views/AutocompleteItem';
import {IAutocompleteItemProps} from '@/shared/ui/Autocomplete/views/AutocompleteItem/AutocompleteItem';
import SearchIcon from '@/../public/icons/search.svg';
import AutocompleteCategory from './views/AutocompleteCategory';
import styles from './Autocomplete.module.scss';

export type IAutoCompleteCategory = {
    id: string,
    label: string,
    icon?: React.FC<any>,
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
    onSelect: (item: Item) => Promise<void> | void,
    className?: string,
    itemComponent?: React.FC<IAutocompleteItemProps<Item>>,
    categoryComponent?: React.FC<IAutocompleteCategoryProps>,
}

function Autocomplete<Item extends IAutoCompleteItem>(props: IAutocompleteProps<Item>) {
    const [isFocused, setFocused] = useState(false);
    const [isOpened, setOpened] = useState(false);
    const [value, setValue] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<{categoryIndex: number, index: number}>();

    const onClose = useCallback(() => {
        setFocused(false);
        setOpened(false);
    }, [setFocused, setOpened]);

    const onOpen = useCallback(() => {
        setFocused(true);
        setOpened(true);
    }, [setFocused, setOpened])

    const onSelect = useCallback((item: Item) => {
        props.onSelect(item);
        onClose();
    }, [setFocused, setOpened]);

    const forwardedRef = useRef(null);
    useClickAway(forwardedRef, onClose);

    useEffect(() => {
        props.onQueryChange(value);
        onOpen();
    }, [value]);

    const categories = useMemo(() => (props.categories || []).map(category => ({
        ...category,
        items: props.items.filter(item => item.categoryId === category.id),
    })).filter(category => category.items.length), [props.categories, props.items])

    const Category = props.categoryComponent || AutocompleteCategory;
    const Item = props.itemComponent || AutocompleteItem;

    const onKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.code === 'ArrowDown') {
            setSelectedItem(prevState => {
                if (!prevState) {
                    return {
                        categoryIndex: 0,
                        index: 0,
                    }
                }
                const isLastElement = prevState.index >= (categories[prevState?.categoryIndex].items.length - 1);
                if (isLastElement) {
                    return {
                        categoryIndex: Math.min(prevState.categoryIndex + 1, categories.length - 1),
                        index: 0,
                    };
                }
                return {
                    categoryIndex: prevState.categoryIndex,
                    index: prevState.index + 1,
                };
            });
        }
        if (event.code === 'ArrowUp') {
            setSelectedItem(prevState => {
                if (!prevState) {
                    return {
                        categoryIndex: categories.length - 1,
                        index: categories[categories.length - 1].items.length - 1,
                    }
                }
                const isFirstElement = prevState.index === 0;
                if (isFirstElement) {
                    const newCategoryIndex = Math.max(prevState.categoryIndex - 1, 0);
                    return {
                        categoryIndex: newCategoryIndex,
                        index: categories[newCategoryIndex].items.length - 1,
                    };
                }
                return {
                    categoryIndex: prevState.categoryIndex,
                    index: prevState.index - 1,
                };
            });
        }
        if (event.code === 'Enter' && selectedItem) {
            const item = categories[selectedItem.categoryIndex].items[selectedItem.index];
            onSelect(item);
        }
    }, [categories, selectedItem, onSelect]);

    const renderItem = ((item: Item, index: number, categoryIndex: number) => {
        return (
            <Item
                key={item.id}
                item={item}
                isSelected={selectedItem?.index === index && categoryIndex === selectedItem?.categoryIndex}
                onHover={() => setSelectedItem({
                    index,
                    categoryIndex,
                })}
                onClick={onSelect as any}
                className={styles.item}
            />
        )
    });

    return (
        <div
            ref={forwardedRef}
            className={[
                styles.Autocomplete,
                props.className,
                isFocused ? styles.focused : null,
            ].filter(Boolean).join(' ')}
        >
            <SearchIcon className={styles.icon} />
            <input
                className={styles.input}
                onChange={(e) => {
                    setValue(e.target.value);
                }}
                value={value}
                onFocus={onOpen}
                onKeyDown={onKeyDown}
                placeholder='Искать...'
            />
            {
                isOpened && (
                    <div className={styles.datalist}>
                        {categories.length
                            ? categories.map((category, categoryIndex) => (
                                <Category key={category.id} category={category}>
                                    {
                                        category.items.map((item, index) => renderItem(item, index, categoryIndex))
                                    }
                                </Category>
                            ))
                            : props.items.map((item, index) => renderItem(item, index, 0))}
                    </div>
                )
            }
        </div>
     );
}

export default Autocomplete;
