import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FaSearch, FaTimes} from 'react-icons/fa';
import { MdVideogameAsset, MdLocalMovies, MdLiveTv } from 'react-icons/md';
import {useBem, useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../../../../routes';
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

interface IHintSection {
	id: string;
	title: string;
	icon: React.ReactNode;
	emptyText: string;
	items: IHintItem[];
}

interface ISearchInputProps {
	onSubmit: (event: React.FormEvent, value: string) => void;
	className?: string;
}

const DEBOUNCE_MS = 260;

function getReleaseYear(date?: string) {
	return date?.slice(0, 4) || '';
}

export function SearchInput({ onSubmit, className }: ISearchInputProps) {
	const bem = useBem('search-input');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const [query, setQuery] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [hints, setHints] = useState<IHintsState>({
		games: [],
		movies: [],
		shows: [],
	});
	const blurTimeoutRef = useRef<number | null>(null);
	const normalizedQuery = query.trim();

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

	const hasHints = hints.games.length > 0 || hints.movies.length > 0 || hints.shows.length > 0;
	const shouldShowHints = normalizedQuery.length > 0 && isFocused;
	const showNoResults = shouldShowHints && !isLoading && !hasHints;

	const sections = useMemo<IHintSection[]>(() => [
		{
			id: 'games',
			title: 'Игры',
			icon: <MdVideogameAsset />,
			emptyText: '🎮 В играх ничего не найдено',
			items: hints.games.map(hint => ({
				id: String(hint.rawg_slug),
				title: hint.rawg_name,
				year: getReleaseYear(hint.rawg_release_date),
				onClick: () => dispatch(goToRoute(ROUTE_GAME, {gameId: hint.rawg_slug})),
			})),
		},
		{
			id: 'movies',
			title: 'Фильмы',
			icon: <MdLocalMovies />,
			emptyText: '🎬 В фильмах ничего не найдено',
			items: hints.movies.map(hint => ({
				id: String(hint.tmdb_id),
				title: hint.tmdb_name,
				year: getReleaseYear(hint.tmdb_release_date),
				onClick: () => dispatch(goToRoute(ROUTE_MOVIE, {movieId: hint.tmdb_id})),
			})),
		},
		{
			id: 'shows',
			title: 'Сериалы',
			icon: <MdLiveTv />,
			emptyText: '📺 В сериалах ничего не найдено',
			items: hints.shows.map(hint => ({
				id: String(hint.tmdb_id),
				title: hint.tmdb_name,
				year: getReleaseYear(hint.tmdb_release_date),
				onClick: () => dispatch(goToRoute(ROUTE_SHOW, {showId: hint.tmdb_id})),
			})),
		},
	], [dispatch, hints.games, hints.movies, hints.shows]);

	return (
		<form
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
				placeholder='Поиск'
				aria-label='Поиск'
				className={bem.element('input')}
				id='searchInput'
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
					}, 120);
				}}
				onChange={(event) => setQuery(event.target.value)}
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
									className={bem.element('hint')}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => {
									item.onClick();
									setQuery('');
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
			</div>
		</form>
	);
}

export default SearchInput;
