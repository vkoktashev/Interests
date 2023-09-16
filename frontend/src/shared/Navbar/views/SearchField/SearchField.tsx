import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import './SearchField.scss';
import {useDataProvider} from '@steroidsjs/core/hooks';
import {useState} from 'react';
import useFastSearchDataProvider from '../../../../hooks/useFastSearchDataProvider';

interface ISearchFieldViewProps {
    className?: string,
}

function SearchField(props: ISearchFieldViewProps) {
    const bem = useBem('SearchField');
    const [query, setQuery] = useState('');

    const items = useFastSearchDataProvider(query);

    console.log(items);

    return (
        <div className={bem(bem.block(), props.className)}>
            <input
                className={bem.element('input')}
                onClick={(e) => {
                    e.preventDefault();
                    // props.onOpen();
                }}
                onChange={e => setQuery(e.target.value)}
                // placeholder={props.placeholder}
                // disabled={props.disabled}
                // required={props.required}
            />
        </div>
    );
}

export default SearchField;
