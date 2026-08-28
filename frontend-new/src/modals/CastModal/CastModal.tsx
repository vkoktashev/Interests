import React, {useMemo, useState} from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import {useBem} from '@steroidsjs/core/hooks';

import PersonCard, {IPersonCardItem} from '../../shared/PersonCard';

import './cast-modal.scss';

interface ICastModalProps extends IModalProps {
	people: IPersonCardItem[];
	mediaName?: string;
	pageWidth?: number;
}

const MODAL_HORIZONTAL_INSETS = 50;

export default function CastModal(props: ICastModalProps) {
	const bem = useBem('cast-modal');
	const people = props.people || [];
	const contentWidth = props.pageWidth
		? Math.max(0, props.pageWidth - MODAL_HORIZONTAL_INSETS)
		: undefined;
	const [search, setSearch] = useState('');
	const filteredPeople = useMemo(() => {
		const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU');

		if (!normalizedSearch) {
			return people;
		}

		return people.filter(person => (
			person.name?.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
			|| person.character?.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
		));
	}, [people, search]);

	return (
		<Modal
			{...props}
			size='lg'
			title='Актёрский состав'
			className={bem.block()}
			onClose={props.onClose}
		>
			<div
				className={bem.element('body')}
				style={contentWidth ? {width: contentWidth} : undefined}
			>
				<div className={bem.element('summary')}>
					<div className={bem.element('summary-info')}>
						{props.mediaName && (
							<div className={bem.element('media-name')}>{props.mediaName}</div>
						)}
						<div className={bem.element('count')}>
							{search.trim()
								? `${getActorsCountLabel(filteredPeople.length)} из ${people.length}`
								: getActorsCountLabel(people.length)}
						</div>
					</div>
					<label className={bem.element('search')}>
						<span className={bem.element('search-label')}>Поиск</span>
						<input
							type='search'
							className={bem.element('search-input')}
							placeholder='Имя актёра или персонажа'
							value={search}
							onChange={event => setSearch(event.target.value)}
						/>
					</label>
				</div>
				{filteredPeople.length > 0 ? (
					<div className={bem.element('grid')}>
						{filteredPeople.map(person => (
							<PersonCard
								key={person.id}
								person={person}
								className={bem.element('card')}
								onClick={props.onClose}
								compact
							/>
						))}
					</div>
				) : (
					<div className={bem.element('empty')}>Ничего не найдено</div>
				)}
			</div>
		</Modal>
	);
}

function getActorsCountLabel(count: number) {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return `${count} актёров`;
	}
	if (lastDigit === 1) {
		return `${count} актёр`;
	}
	if (lastDigit >= 2 && lastDigit <= 4) {
		return `${count} актёра`;
	}
	return `${count} актёров`;
}
