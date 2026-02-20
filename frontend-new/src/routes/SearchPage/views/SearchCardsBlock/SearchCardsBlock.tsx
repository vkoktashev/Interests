import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import SearchCard from '../SearchCard';
import {ISearchCardData} from '../searchTypes';
import './search-cards.scss';

interface ISearchCardsBlockProps {
	objects: ISearchCardData[];
	emptyText: string;
	hidden?: boolean;
	className?: string;
}

function SearchCardsBlock({objects, hidden, className, emptyText}: ISearchCardsBlockProps) {
	const bem = useBem('search-cards');

	return (
		<div hidden={hidden} className={bem(bem.block(), className)}>
			<div className={bem.element('body')}>
				{objects.length > 0 ? (
					<div className={bem.element('cards')}>
						{objects.map(object => (
							<SearchCard
								info={object}
								key={object.id}
								className={bem.element('card')}
							/>
						))}
					</div>
				) : (
					<div className={bem.element('empty')}>
						{emptyText}
					</div>
				)}
			</div>
		</div>
	);
}

export default SearchCardsBlock;
