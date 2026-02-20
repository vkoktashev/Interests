import React, {useMemo} from 'react';
import SearchCardsBlock from './SearchCardsBlock';
import {mapShowToCard} from './searchMappers';
import {ITmdbMediaItem} from './searchTypes';

interface IShowCardsProps {
	shows: ITmdbMediaItem[];
	hidden?: boolean;
}

function ShowCards({shows, hidden}: IShowCardsProps) {
	const objects = useMemo(() => shows.map(mapShowToCard), [shows]);

	return (
		<SearchCardsBlock
			hidden={hidden}
			objects={objects}
			emptyText='Сериалы не найдены'
		/>
	);
}

export default ShowCards;
