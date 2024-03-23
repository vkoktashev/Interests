import React from 'react';
import styles from './AutocompleteCategory.module.scss';
import {IAutoCompleteCategory} from '@/shared/ui/Autocomplete/Autocomplete';

export interface IAutocompleteCategoryProps {
    className?: string,
    category: IAutoCompleteCategory,
    children: React.ReactNode,
}

function AutocompleteCategory(props: IAutocompleteCategoryProps) {
    return (
        <div className={[styles.AutocompleteCategory, props.className].join(' ')}>
            <div>
                {props.category.icon}
                <span>
                    {props.category.label}
                </span>
            </div>
            {props.children}
        </div>
    );
}

export default AutocompleteCategory;
