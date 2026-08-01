import React, {useMemo} from 'react';
import {DropDownField} from '@steroidsjs/core/ui/form';
import {useBem} from '@steroidsjs/core/hooks';
import CheckboxFieldView from '../../ui/form/CheckboxField/CheckboxFieldView';
import {GAME_TYPE_OPTIONS, IGamePlatform, PC_PLATFORM_ID, TGameTypeId} from './views/searchTypes';
import './game-filters.scss';

interface IGameFiltersProps {
	platforms: IGamePlatform[];
	selectedPlatformIds: number[];
	selectedTypeIds: number[];
	onPlatformChange: (platformIds: number[]) => void;
	onTypeChange: (gameTypeId: TGameTypeId, isSelected: boolean) => void;
}

function GameFilters({
	platforms,
	selectedPlatformIds,
	selectedTypeIds,
	onPlatformChange,
	onTypeChange,
}: IGameFiltersProps) {
	const bem = useBem('game-filters');
	const selectedTypeIdSet = useMemo(() => new Set(selectedTypeIds), [selectedTypeIds]);
	const platformItems = useMemo(() => platforms.map(platform => ({
		id: platform.id,
		label: platform.id === PC_PLATFORM_ID ? 'PC' : platform.name,
	})), [platforms]);

	return (
		<details className={bem.block()}>
			<summary className={bem.element('summary')}>
				<span>Фильтры</span>
				<span className={bem.element('count')}>
					Типов: {selectedTypeIds.length} · платформ: {selectedPlatformIds.length}
				</span>
			</summary>
			<div className={bem.element('content')}>
				<div className={bem.element('section')}>
					<div className={bem.element('title')}>Типы игр</div>
					<div className={bem.element('options')}>
						{GAME_TYPE_OPTIONS.map(gameType => (
							<CheckboxFieldView
								className={bem.element('option')}
								inputProps={{
									type: 'checkbox',
									checked: selectedTypeIdSet.has(gameType.id),
									onChange: event => onTypeChange(gameType.id, event.target.checked),
								}}
								key={gameType.id}
								label={gameType.label}
								size='sm'
							/>
						))}
					</div>
				</div>
				<div className={bem.element('section')}>
					<div className={bem.element('title')}>Платформы</div>
					<DropDownField
						attribute='platformIds'
						autoComplete
						fieldLayoutClassName={bem.element('platforms')}
						hasCloseOnSelect={false}
						items={platformItems}
						itemsContent={{type: 'checkbox'}}
						maxHeight={320}
						multiple
						onClose={selectedIds => onPlatformChange(selectedIds.map(Number))}
						placeholder='Выберите платформы'
						searchPlaceholder='Найти платформу'
						showEllipses
						size='sm'
					/>
				</div>
			</div>
		</details>
	);
}

export default GameFilters;
