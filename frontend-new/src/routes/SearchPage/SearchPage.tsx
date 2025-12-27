import React, {useCallback, useEffect, useRef, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import GameCards from './views/GameCards';
import MovieCards from './views/MovieCards';
import ShowCards from './views/ShowCards';
import UserCards from './views/UserCards';
import CategoriesTab from '../../shared/CategoriesTab';

import './search-page.scss';
import {useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {Form, InputField} from '@steroidsjs/core/ui/form';
import {formChange, formSubmit} from '@steroidsjs/core/actions/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import Pagination from '@steroidsjs/core/ui/list/Pagination/Pagination';

const PAGE_SIZE = 10;
const SEARCH_PAGE_FORM = 'search_page_form';

function SearchPage() {
	const dispatch = useDispatch();
	const {http} = useComponents();
	const formValues = useSelector(state => getFormValues(state, SEARCH_PAGE_FORM) || {});

	let query = useSelector(state => decodeURIComponent(getRouteParams(state)?.query));
	const [isLoading, setLoading] = useState(false);
	const [lastQuery, setLastQuery] = useState(query);

	const [games, setGames] = useState([]);
	const [movies, setMovies] = useState([]);
	const [shows, setShows] = useState([]);
	const [users, setUsers] = useState([]);

	const searchGames = useCallback(async (query: string, page: number) => {
		const response = await http.get('/games/search/rawg/', {
				query: query,
				page,
				page_size: PAGE_SIZE,
			});
		setGames(response);
	}, []);

	const searchMovies = useCallback(async (query: string, page: number) => {
		const response = await http.get('/movies/search/tmdb/', {
			query: query,
			page,
			page_size: PAGE_SIZE,
		});
		setMovies(response.results);
	}, []);

	const searchShows = useCallback(async (query: string, page: number) => {
		const response = await http.get('/shows/search/tmdb/', {
			query: query,
			page,
			page_size: PAGE_SIZE,
		});
		setShows(response.results);
	}, [setShows]);

	const searchUsers = useCallback(async (query: string, page: number) => {
		const response = await http.get('/users/search/', {
			query: query,
			page,
			page_size: PAGE_SIZE,
		});
		setUsers(response);
	}, []);

	const onSubmit = useCallback(async (values) => {
		setLoading(true);
		if (lastQuery !== values.query && values.page !== 1) {
			dispatch(formChange(SEARCH_PAGE_FORM, 'page', 1));
			values.page = 1;
		}
		setLastQuery(values.query);
		if (values.activeCategory === 'Игры') {
			await searchGames(values.query, values.page);
		}
		if (values.activeCategory === 'Фильмы') {
			await searchMovies(values.query, values.page);
		}
		if (values.activeCategory === 'Сериалы') {
			await searchShows(values.query, values.page);
		}
		if (values.activeCategory === 'Пользователи') {
			await searchUsers(values.query, values.page);
		}
		setLoading(false);
	}, [searchGames, searchMovies, searchShows, searchUsers, lastQuery]);

	useEffect(() => {
		dispatch(formChange(SEARCH_PAGE_FORM, 'query', query));
		dispatch(formSubmit(SEARCH_PAGE_FORM));
	}, [query]);

	return (
		<div className='search-page'>
			<div className='search-page__body'>
				<Form
					formId={SEARCH_PAGE_FORM}
					className='search-page__form'
					initialValues={{
						query,
						page: 1,
						activeCategory: 'Игры',
					}}
					onSubmit={onSubmit}
					useRedux
				>
					<h1>
						Поиск
					</h1>
					<InputField
						attribute='query'
						label={__('Запрос')}
					/>
				</Form>
				<CategoriesTab
					categories={['Игры', 'Фильмы', 'Сериалы', 'Пользователи']}
					activeCategory={formValues.activeCategory}
					onChangeCategory={(category: string) => {
						dispatch(formChange(SEARCH_PAGE_FORM, {
							activeCategory: category,
							page: 1,
						}));
						dispatch(formSubmit(SEARCH_PAGE_FORM));
					}}>
					<div className='search-page__results'>
						{
							formValues.activeCategory === 'Игры' && (
								<LoadingOverlay
									active={isLoading}
									spinner
									text='Ищем игры...'
								>
									<GameCards
										games={games}
										hidden={formValues.activeCategory !== 'Игры'}
									/>
								</LoadingOverlay>
							)
						}

						{
							formValues.activeCategory === 'Фильмы' && (
								<LoadingOverlay
									active={isLoading}
									spinner
									text='Ищем фильмы...'
								>
									<MovieCards
										movies={movies}
										hidden={formValues.activeCategory !== 'Фильмы'}
									/>
								</LoadingOverlay>
							)
						}

						{
							formValues.activeCategory === 'Сериалы' && (
								<LoadingOverlay
									active={isLoading}
									spinner
									text='Ищем сериалы...'
								>
									<ShowCards
										shows={shows}
										hidden={formValues.activeCategory !== 'Сериалы'}
									/>
								</LoadingOverlay>
							)
						}

						{
							formValues.activeCategory === 'Пользователи' && (
								<LoadingOverlay
									active={isLoading}
									spinner
									text='Ищем пользователей...'
								>
									<UserCards
										users={users}
										hidden={formValues.activeCategory !== 'Пользователи'}
									/>
								</LoadingOverlay>
							)
						}

						<Pagination
							showSteps
							aroundCount={5}
							list={{
								total: 100,
								page: formValues?.page,
								pageSize: PAGE_SIZE,
							}}
							onChange={page => {
								dispatch(formChange(SEARCH_PAGE_FORM, 'page', page));
								dispatch(formSubmit(SEARCH_PAGE_FORM));
							}}
						/>
					</div>
				</CategoriesTab>
			</div>
		</div>
	);
}

export default SearchPage;
