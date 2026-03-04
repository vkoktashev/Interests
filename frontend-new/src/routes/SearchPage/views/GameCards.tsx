import React, {useMemo} from 'react';
import SearchCardsBlock from './SearchCardsBlock';
import {mapGameToCard} from './searchMappers';
import {IGameSearchItem} from './searchTypes';

interface IGameCardsProps {
	games: IGameSearchItem[];
	hidden?: boolean;
}

function GameCards({games, hidden}: IGameCardsProps) {
	const objects = useMemo(() => games.map(mapGameToCard), [games]);

	return (
		<SearchCardsBlock
			hidden={hidden}
			objects={objects}
			emptyText='Игры не найдены'
		/>
	);
}

export default GameCards;
