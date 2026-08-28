import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FaSearch, FaTimes} from 'react-icons/fa';
import {MdLiveTv, MdLocalMovies, MdVideogameAsset} from 'react-icons/md';
import {useBem, useComponents} from '@steroidsjs/core/hooks';

import {ICollectionEditableItem, TCollectionItemType} from '../../shared/CollectionItemsEditor';
import './collection-content-search.scss';

interface ISearchItem {
	type: TCollectionItemType;
	object_id: number;
	name: string;
	release_year: number | null;
	cover_url: string;
}

interface ISearchResults {
	games: ISearchItem[];
	movies: ISearchItem[];
	shows: ISearchItem[];
}

interface ICollectionContentSearchProps {
	selectedItems: ICollectionEditableItem[];
	onAdd: (item: ICollectionEditableItem) => void | Promise<void>;
}

const EMPTY_RESULTS: ISearchResults = {games: [], movies: [], shows: []};
const SEARCH_SECTIONS = [
	{key: 'games', title: 'Игры', icon: <MdVideogameAsset />},
	{key: 'movies', title: 'Фильмы', icon: <MdLocalMovies />},
	{key: 'shows', title: 'Сериалы', icon: <MdLiveTv />},
] as const;
const DEBOUNCE_MS = 250;

function CollectionContentSearch(props: ICollectionContentSearchProps) {
	const bem = useBem('collection-content-search');
	const {http} = useComponents();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<ISearchResults>(EMPTY_RESULTS);
	const [isFocused, setFocused] = useState(false);
	const [isLoading, setLoading] = useState(false);
	const [addingItemKey, setAddingItemKey] = useState('');
	const [activeIndex, setActiveIndex] = useState(-1);
	const blurTimeoutRef = useRef<number | null>(null);
	const requestIdRef = useRef(0);
	const normalizedQuery = query.trim();
	const selectedKeys = useMemo(() => new Set(
		props.selectedItems.map(item => `${item.type}-${item.order_id}`),
	), [props.selectedItems]);
	const sections = useMemo(() => SEARCH_SECTIONS.map(section => ({
		...section,
		items: results[section.key].filter(item => !selectedKeys.has(`${item.type}-${item.object_id}`)),
	})), [results, selectedKeys]);
	const selectableItems = useMemo(
		() => sections.flatMap(section => section.items),
		[sections],
	);

	useEffect(() => {
		const requestId = requestIdRef.current + 1;
		requestIdRef.current = requestId;
		if (!normalizedQuery) {
			setResults(EMPTY_RESULTS);
			setLoading(false);
			return;
		}

		const timeoutId = window.setTimeout(async () => {
			setLoading(true);
			try {
				const response = await http.get('/collections/content_search/', {query: normalizedQuery});
				if (requestIdRef.current === requestId) {
					setResults(response || EMPTY_RESULTS);
				}
			} catch {
				if (requestIdRef.current === requestId) {
					setResults(EMPTY_RESULTS);
				}
			} finally {
				if (requestIdRef.current === requestId) {
					setLoading(false);
				}
			}
		}, DEBOUNCE_MS);

		return () => window.clearTimeout(timeoutId);
	}, [http, normalizedQuery]);

	useEffect(() => () => {
		if (blurTimeoutRef.current) {
			window.clearTimeout(blurTimeoutRef.current);
		}
	}, []);

	useEffect(() => setActiveIndex(-1), [normalizedQuery, results]);

	const addItem = useCallback(async (item: ISearchItem) => {
		if (addingItemKey) {
			return;
		}

		setAddingItemKey(`${item.type}-${item.object_id}`);
		try {
			await props.onAdd({
				type: item.type,
				id: item.object_id,
				order_id: item.object_id,
				name: item.name,
				release_year: item.release_year,
				cover_url: item.cover_url,
			});
			setQuery('');
			setResults(EMPTY_RESULTS);
			setActiveIndex(-1);
		} catch {
			// Ошибку показывает компонент, который сохраняет выбранный элемент.
		} finally {
			setAddingItemKey('');
		}
	}, [addingItemKey, props.onAdd]);

	const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown' && selectableItems.length > 0) {
			event.preventDefault();
			setActiveIndex(index => (index + 1) % selectableItems.length);
		} else if (event.key === 'ArrowUp' && selectableItems.length > 0) {
			event.preventDefault();
			setActiveIndex(index => (index <= 0 ? selectableItems.length - 1 : index - 1));
		} else if (event.key === 'Enter' && activeIndex >= 0 && selectableItems[activeIndex]) {
			event.preventDefault();
			void addItem(selectableItems[activeIndex]);
		} else if (event.key === 'Escape') {
			setFocused(false);
			setActiveIndex(-1);
		}
	}, [activeIndex, addItem, selectableItems]);

	let flatIndex = 0;
	const showResults = isFocused && !!normalizedQuery;

	return (
		<div className={bem.block()}>
			<div className={bem.element('control')}>
				<FaSearch className={bem.element('search-icon')} />
				<input
					type='text'
					value={query}
					placeholder='Найти игру, фильм или сериал'
					aria-label='Поиск контента для подборки'
					autoComplete='off'
					className={bem.element('input')}
					onChange={event => setQuery(event.target.value)}
					onKeyDown={onKeyDown}
					onFocus={() => {
						if (blurTimeoutRef.current) {
							window.clearTimeout(blurTimeoutRef.current);
						}
						setFocused(true);
					}}
					onBlur={() => {
						blurTimeoutRef.current = window.setTimeout(() => setFocused(false), 120);
					}}
				/>
				{!!query && (
					<button
						type='button'
						className={bem.element('clear')}
						aria-label='Очистить поиск'
						onMouseDown={event => event.preventDefault()}
						onClick={() => setQuery('')}
					>
						<FaTimes />
					</button>
				)}
			</div>

			{showResults && (
				<div className={bem.element('results')}>
					{isLoading ? (
						<div className={bem.element('state')}>Ищем в базе...</div>
					) : selectableItems.length > 0 ? sections.map(section => section.items.length > 0 && (
						<section className={bem.element('section')} key={section.key}>
							<div className={bem.element('section-title')}>
								{section.icon}
								<span>{section.title}</span>
							</div>
							{section.items.map(item => {
								const itemIndex = flatIndex;
								flatIndex += 1;
								return (
									<button
										type='button'
										key={`${item.type}-${item.object_id}`}
										className={bem.element('result', {active: activeIndex === itemIndex})}
										disabled={!!addingItemKey}
										onMouseDown={event => event.preventDefault()}
										onMouseEnter={() => setActiveIndex(itemIndex)}
										onClick={() => void addItem(item)}
									>
										<span className={bem.element('result-cover')}>
											{item.cover_url ? <img src={item.cover_url} alt='' /> : null}
										</span>
										<span className={bem.element('result-name')}>{item.name}</span>
										<span className={bem.element('result-year')}>{item.release_year || ''}</span>
									</button>
								);
							})}
						</section>
					)) : (
						<div className={bem.element('state')}>Ничего не найдено</div>
					)}
				</div>
			)}
		</div>
	);
}

export default CollectionContentSearch;
