import React from 'react';
import styles from './AutocompleteCategory.module.scss';
import {IAutoCompleteCategory} from '@/shared/ui/Autocomplete/Autocomplete';

export interface IAutocompleteCategoryProps {
    className?: string,
    category: IAutoCompleteCategory,
    children: React.ReactNode,
}

function AutocompleteCategory(props: IAutocompleteCategoryProps) {
    const Icon = props.category.icon;

    return (
        <div className={[styles.AutocompleteCategory, props.className].join(' ')}>
            <div className={styles.row}>
                {Icon && (
                    <Icon className={styles.icon} />
                )}
                <span>
                    {props.category.label}
                </span>
            </div>
            {props.children}
        </div>
    );
}

export default AutocompleteCategory;
