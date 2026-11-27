import React, {useEffect, useRef, useState} from 'react';
import {useBem, useComponents} from '@steroidsjs/core/hooks';
import {
	EMPTY_MEDIA_FILTERS,
	getMediaFilterEntries,
	IMediaSearchFilters,
	MEDIA_SEARCH_PATHS,
	MEDIA_SORT_OPTIONS,
	MIN_RATINGS,
	ORIGINAL_LANGUAGES,
	TMediaSearchCategory,
} from './views/mediaSearchFilters';
import './media-filters.scss';

interface IGenre {
	id: number;
	name: string;
}

interface IMediaFiltersProps {
	category: TMediaSearchCategory;
	hasTitleQuery: boolean;
	filters: IMediaSearchFilters;
	onApply: (filters: IMediaSearchFilters) => void;
	onBrowse: () => void;
}

function MediaFilters({category, hasTitleQuery, filters, onApply, onBrowse}: IMediaFiltersProps) {
	const bem = useBem('media-filters');
	const {http} = useComponents();
	const [draft, setDraft] = useState(filters);
	const yearInputRef = useRef<HTMLInputElement>(null);
	const [genres, setGenres] = useState<IGenre[]>([]);
	const [genresUnavailable, setGenresUnavailable] = useState(false);
	const activeCount = getMediaFilterEntries(filters, hasTitleQuery).length;

	useEffect(() => setDraft(filters), [filters]);

	useEffect(() => {
		if (hasTitleQuery) {
			return;
		}

		setGenresUnavailable(false);
		let active = true;
		http.get(`${MEDIA_SEARCH_PATHS[category]}/genres/`).then(response => {
			if (active && Array.isArray(response)) {
				setGenres((response as IGenre[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'ru')));
			}
		}).catch(() => {
			if (active) {
				setGenresUnavailable(true);
			}
		});
		return () => {
			active = false;
		};
	}, [category, hasTitleQuery, http]);

	const change = (field: keyof IMediaSearchFilters, value: string) => {
		setDraft(current => ({...current, [field]: value}));
	};

	return (
		<details className={bem.block()} open>
			<summary className={bem.element('summary')}>
				Фильтры {activeCount > 0 && <span className={bem.element('count')}>{activeCount}</span>}
			</summary>
			<div className={bem.element('form')}>
				<div className={bem.element('fields')}>
					<label className={bem.element('field')}>
						{category === 'Фильмы' ? 'Год выхода' : 'Год премьеры'}
						<input
							ref={yearInputRef}
							className={bem.element('control')}
							type='number'
							inputMode='numeric'
							min={1000}
							max={9999}
							placeholder='Любой'
							value={draft.year}
							onChange={event => change('year', event.currentTarget.value)}
						/>
					</label>
					{!hasTitleQuery && (
						<>
							<label className={bem.element('field')}>
								Жанр
								<select
									className={bem.element('control')}
									value={draft.genre}
									onChange={event => change('genre', event.currentTarget.value)}
								>
									<option value=''>{genresUnavailable ? 'Жанры недоступны' : 'Любой жанр'}</option>
									{draft.genre && !genres.some(genre => String(genre.id) === draft.genre) && (
										<option value={draft.genre}>Жанр {draft.genre}</option>
									)}
									{genres.map(genre => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
								</select>
							</label>
							<label className={bem.element('field')}>
								Язык оригинала
								<select
									className={bem.element('control')}
									value={draft.original_language}
									onChange={event => change('original_language', event.currentTarget.value)}
								>
									<option value=''>Любой язык</option>
									{ORIGINAL_LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
								</select>
							</label>
							<label className={bem.element('field')}>
								Оценка TMDB от
								<select
									className={bem.element('control')}
									value={draft.min_rating}
									onChange={event => change('min_rating', event.currentTarget.value)}
								>
									<option value=''>Любая оценка</option>
									{MIN_RATINGS.map(rating => <option key={rating} value={rating}>{rating.replace('.', ',')}</option>)}
								</select>
							</label>
							<label className={bem.element('field')}>
								Сортировка
								<select
									className={bem.element('control')}
									value={draft.sort}
									onChange={event => change('sort', event.currentTarget.value)}
								>
									{MEDIA_SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
								</select>
							</label>
						</>
					)}
				</div>
				<div className={bem.element('actions')}>
					<button type='button' className={bem.element('apply')} onClick={() => {
						if (yearInputRef.current?.reportValidity()) {
							onApply(draft);
						}
					}}>
						Применить
					</button>
					{(activeCount > 0 || getMediaFilterEntries(draft, hasTitleQuery).length > 0) && (
						<button type='button' className={bem.element('secondary')} onClick={() => {
							setDraft(EMPTY_MEDIA_FILTERS);
							onApply(EMPTY_MEDIA_FILTERS);
						}}>
							Сбросить
						</button>
					)}
					{hasTitleQuery && (
						<button type='button' className={bem.element('secondary')} onClick={onBrowse}>
							Подбор без названия
						</button>
					)}
				</div>
				{hasTitleQuery && (
					<p className={bem.element('hint')}>Жанр, язык, оценка и сортировка доступны при подборе без названия.</p>
				)}
			</div>
		</details>
	);
}

export default MediaFilters;
