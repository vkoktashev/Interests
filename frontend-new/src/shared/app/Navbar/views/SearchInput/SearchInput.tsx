import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FaSearch, FaTimes} from 'react-icons/fa';
import { MdVideogameAsset, MdLocalMovies, MdLiveTv } from 'react-icons/md';
import {useBem, useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../../../../routes';
import useWindowDimensions from '../../../../../hooks/useWindowDimensions';
import './search-input.scss';

interface IGameHint {
	rawg_slug: string;
	rawg_name: string;
	rawg_release_date?: string;
}

interface IMovieHint {
	tmdb_id: number;
	tmdb_name: string;
	tmdb_release_date?: string;
}

interface IShowHint {
	tmdb_id: number;
	tmdb_name: string;
	tmdb_release_date?: string;
}

interface IHintsState {
	games: IGameHint[];
	movies: IMovieHint[];
	shows: IShowHint[];
}

interface IHintItem {
	id: string;
	title: string;
	year: string;
	onClick: () => void;
}

interface IHintItemWithIndex extends IHintItem {
	flatIndex: number;
}

interface IHintSection {
	id: string;
	title: string;
	icon: React.ReactNode;
	emptyText: string;
	items: IHintItemWithIndex[];
}

interface ISearchInputProps {
	onSubmit: (event: React.FormEvent, value: string) => void;
	className?: string;
	autoFocus?: boolean;
}

const DEBOUNCE_MS = 260;
const MOBILE_BREAKPOINT = 600;

function getReleaseYear(date?: string) {
	return date?.slice(0, 4) || '';
}

export function SearchInput({ onSubmit, className, autoFocus = false }: ISearchInputProps) {
	const bem = useBem('search-input');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const {width} = useWindowDimensions();
	const [query, setQuery] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [activeHintIndex, setActiveHintIndex] = useState(-1);
	const [hints, setHints] = useState<IHintsState>({
		games: [],
		movies: [],
		shows: [],
	});
	const blurTimeoutRef = useRef<number | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const normalizedQuery = query.trim();
	const isMobile = width <= MOBILE_BREAKPOINT;
	const maxItemsPerSection = isMobile ? 3 : 5;

	const fetchHints = useCallback(async (value: string) => {
		try {
			setIsLoading(true);
			const [games, movies, shows] = await Promise.all([
				http.get('/games/search/', {query: value}),
				http.get('/movies/search/', {query: value}),
				http.get('/shows/search/', {query: value}),
			]);

			setHints({
				games: games || [],
				movies: movies || [],
				shows: shows || [],
			});
		} catch {
			setHints({
				games: [],
				movies: [],
				shows: [],
			});
		} finally {
			setIsLoading(false);
		}
	}, [http]);

	useEffect(() => {
		if (!normalizedQuery) {
			setHints({
				games: [],
				movies: [],
				shows: [],
			});
			setIsLoading(false);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			fetchHints(normalizedQuery);
		}, DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timeoutId);
		};
	}, [fetchHints, normalizedQuery]);

	useEffect(() => {
		return () => {
			if (blurTimeoutRef.current) {
				window.clearTimeout(blurTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!autoFocus) {
			return;
		}
		const timeoutId = window.setTimeout(() => {
			inputRef.current?.focus();
		}, 0);
		return () => window.clearTimeout(timeoutId);
	}, [autoFocus]);

	useEffect(() => {
		setActiveHintIndex(-1);
	}, [normalizedQuery, hints.games, hints.movies, hints.shows]);

	const hasHints = hints.games.length > 0 || hints.movies.length > 0 || hints.shows.length > 0;
	const shouldShowHints = normalizedQuery.length > 0 && isFocused;
	const showNoResults = shouldShowHints && !isLoading && !hasHints;

	const sections = useMemo<IHintSection[]>(() => {
		let currentIndex = 0;
		const withIndexes = (items: IHintItem[]): IHintItemWithIndex[] => items.map(item => ({
			...item,
			flatIndex: currentIndex++,
		}));
		const limitItems = <T,>(items: T[]) => items.slice(0, maxItemsPerSection);

		return [
		{
			id: 'games',
			title: 'Игры',
			icon: <MdVideogameAsset />,
			emptyText: '🎮 В играх ничего не найдено',
			items: withIndexes(limitItems(hints.games).map(hint => ({
				id: String(hint.rawg_slug),
				title: hint.rawg_name,
				year: getReleaseYear(hint.rawg_release_date),
				onClick: () => dispatch(goToRoute(ROUTE_GAME, {gameId: hint.rawg_slug})),
			}))),
		},
		{
			id: 'movies',
			title: 'Фильмы',
			icon: <MdLocalMovies />,
			emptyText: '🎬 В фильмах ничего не найдено',
			items: withIndexes(limitItems(hints.movies).map(hint => ({
				id: String(hint.tmdb_id),
				title: hint.tmdb_name,
				year: getReleaseYear(hint.tmdb_release_date),
				onClick: () => dispatch(goToRoute(ROUTE_MOVIE, {movieId: hint.tmdb_id})),
			}))),
		},
		{
			id: 'shows',
			title: 'Сериалы',
			icon: <MdLiveTv />,
			emptyText: '📺 В сериалах ничего не найдено',
			items: withIndexes(limitItems(hints.shows).map(hint => ({
				id: String(hint.tmdb_id),
				title: hint.tmdb_name,
				year: getReleaseYear(hint.tmdb_release_date),
				onClick: () => dispatch(goToRoute(ROUTE_SHOW, {showId: hint.tmdb_id})),
			}))),
		},
	];
	}, [dispatch, hints.games, hints.movies, hints.shows, maxItemsPerSection]);
	const selectableHints = useMemo(() => sections.flatMap(section => section.items), [sections]);

	const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
		if (!normalizedQuery) {
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!isFocused) {
				setIsFocused(true);
			}
			if (!selectableHints.length) {
				return;
			}
			setActiveHintIndex(prev => (prev < 0 ? 0 : (prev + 1) % selectableHints.length));
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (!isFocused) {
				setIsFocused(true);
			}
			if (!selectableHints.length) {
				return;
			}
			setActiveHintIndex(prev => (prev < 0 ? selectableHints.length - 1 : (prev - 1 + selectableHints.length) % selectableHints.length));
			return;
		}

		if (event.key === 'Enter' && activeHintIndex >= 0 && selectableHints[activeHintIndex]) {
			event.preventDefault();
			selectableHints[activeHintIndex].onClick();
			setQuery('');
			setActiveHintIndex(-1);
			return;
		}

		if (event.key === 'Escape') {
			setIsFocused(false);
			setActiveHintIndex(-1);
		}
	}, [activeHintIndex, isFocused, normalizedQuery, selectableHints]);

	return (
		<form
			autoComplete='off'
			onSubmit={(event) => {
				onSubmit(event, normalizedQuery);
				setQuery('');
				setIsFocused(false);
			}}
			className={bem(bem.block(), className)}>
			<span className={bem.element('icon')}>
				<FaSearch />
			</span>
			<input
				type='text'
				autoComplete='off'
				autoCorrect='off'
				autoCapitalize='none'
				spellCheck={false}
				placeholder='Поиск'
				aria-label='Поиск'
				className={bem.element('input')}
				id='searchInput'
				ref={inputRef}
				value={query}
				onFocus={() => {
					if (blurTimeoutRef.current) {
						window.clearTimeout(blurTimeoutRef.current);
					}
					setIsFocused(true);
				}}
				onBlur={() => {
					blurTimeoutRef.current = window.setTimeout(() => {
						setIsFocused(false);
						setActiveHintIndex(-1);
					}, 120);
				}}
				onChange={(event) => setQuery(event.target.value)}
				onKeyDown={handleInputKeyDown}
			/>

			{normalizedQuery && (
				<button
					type='button'
					className={bem.element('clear')}
					aria-label='Очистить поиск'
					onMouseDown={(event) => event.preventDefault()}
					onClick={() => {
						setQuery('');
						setIsFocused(false);
						setActiveHintIndex(-1);
					}}
				>
					<FaTimes />
				</button>
			)}

			<div className={bem.element('hints', {visible: shouldShowHints})}>
				<div hidden={!isLoading} className={bem.element('loading')}>
					Ищем результаты...
				</div>
				<div hidden={!showNoResults} className={bem.element('empty')}>
					Ничего не найдено
				</div>

				{sections.map(section => (
					<div key={section.id} className={bem.element('section')}>
						<div className={bem.element('section-title')}>
							<span className={bem.element('section-icon')}>{section.icon}</span>
							{section.title}
						</div>
						{section.items.length > 0 ? (
							section.items.map(item => (
								<button
								type='button'
								key={item.id}
								className={bem.element('hint', {active: activeHintIndex === item.flatIndex})}
								onMouseDown={(event) => event.preventDefault()}
								onMouseEnter={() => setActiveHintIndex(item.flatIndex)}
								onClick={() => {
									item.onClick();
									setQuery('');
									setActiveHintIndex(-1);
								}}
							>
									<span className={bem.element('hint-title')}>
										{item.title}
									</span>
									<span className={bem.element('hint-year')}>
										{item.year}
									</span>
								</button>
							))
						) : (
							<div className={bem.element('section-empty')}>
								{section.emptyText}
							</div>
						)}
					</div>
				))}

				{isMobile && normalizedQuery && (
					<button
						type='submit'
						className={bem.element('show-all')}
						onMouseDown={(event) => event.preventDefault()}
					>
						Открыть подробный поиск по запросу «{normalizedQuery}»
					</button>
				)}
			</div>
		</form>
	);
}

export default SearchInput;
