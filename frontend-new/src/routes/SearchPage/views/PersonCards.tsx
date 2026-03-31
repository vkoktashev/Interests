import React, {useMemo} from 'react';
import SearchCardsBlock from './SearchCardsBlock';
import {mapPersonToCard} from './searchMappers';
import {IPersonSearchItem} from './searchTypes';

interface IPersonCardsProps {
	people: IPersonSearchItem[];
	hidden?: boolean;
}

function PersonCards({people, hidden}: IPersonCardsProps) {
	const objects = useMemo(() => people.map(mapPersonToCard), [people]);

	return (
		<SearchCardsBlock
			hidden={hidden}
			objects={objects}
			emptyText='Люди не найдены'
		/>
	);
}

export default PersonCards;
