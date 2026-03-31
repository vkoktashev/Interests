import React, {useEffect, useMemo, useState} from 'react';

import './person-page.scss';
import {useBem, useSelector, useFetch} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParam} from '@steroidsjs/core/reducers/router';
import {Loader} from '@steroidsjs/core/ui/layout';

import TmdbMediaCard from '../../shared/TmdbMediaCard/TmdbMediaCard';

type TPersonMovie = {
	id: number;
	name: string;
	original_name: string;
	poster_path: string;
	release_date: string;
	score: number | null;
	roles: string[];
	character?: string;
	user_status?: string | null;
	user_score?: number | null;
};
type TPersonShow = {
	id: number;
	name: string;
	original_name: string;
	poster_path: string;
	release_date: string;
	score: number | null;
	roles: string[];
	character?: string;
	user_status?: string | null;
	user_score?: number | null;
};

const ROLE_LABELS: Record<string, string> = {
	actor: 'Актер',
	director: 'Режиссер',
};

const STATUS_BADGE_MAP: Record<string, {label: string; tone: 'planned' | 'done' | 'progress' | 'stopped'}> = {
	'Буду смотреть': {label: 'Буду смотреть', tone: 'planned'},
	'Посмотрел': {label: 'Посмотрел', tone: 'done'},
	'Дропнул': {label: 'Дропнул', tone: 'stopped'},
	'Не смотрел': {label: 'Не смотрел', tone: 'progress'},
	'Смотрю': {label: 'Смотрю', tone: 'progress'},
};

const SECONDARY_CHARACTER_PATTERNS = [
	/\bself\b/i,
	/\bhimself\b/i,
	/\bherself\b/i,
	/\bthemselves\b/i,
	/\bcameo\b/i,
	/\barchive footage\b/i,
	/\buncredited\b/i,
];

function isPrimaryWork(item: TPersonMovie | TPersonShow): boolean {
	if ((item.roles || []).includes('director')) {
		return true;
	}

	const character = (item.character || '').trim();
	if (!character) {
		return true;
	}

	return !SECONDARY_CHARACTER_PATTERNS.some(pattern => pattern.test(character));
}

function getEmptyWorksText(
	mediaLabel: 'фильмов' | 'сериалов',
	isOnlyMine: boolean,
	isPrimaryOnly: boolean,
): string {
	if (isOnlyMine && isPrimaryOnly) {
		return `У вас пока нет отмеченных основных ${mediaLabel} с этим человеком.`;
	}
	if (isOnlyMine) {
		return `У вас пока нет отмеченных ${mediaLabel} с этим человеком.`;
	}
	if (isPrimaryOnly) {
		return `Основные работы в разделе ${mediaLabel} пока не найдены.`;
	}
	return `${mediaLabel === 'фильмов'
		? 'Фильмы с этим человеком пока не найдены.'
		: 'Сериалы с этим человеком пока не найдены.'}`;
}

export function PersonPage() {
	const bem = useBem('person-page');
	const user = useSelector(getUser);
	const personId = useSelector(state => getRouteParam(state, 'personId'));
	const isAuthorized = Boolean(user?.id);
	const [isOnlyMine, setIsOnlyMine] = useState(false);
	const [isPrimaryOnly, setIsPrimaryOnly] = useState(false);

	const fetchConfig = useMemo(() => personId && ({
		url: `/people/person/${personId}/`,
		method: 'get',
	}), [personId]);

	const {data: person} = useFetch(fetchConfig);

	useEffect(() => {
		document.title = person?.name ? `${person.name} — Interests` : 'Interests';
	}, [person?.name]);

	useEffect(() => {
		if (!isAuthorized) {
			setIsOnlyMine(false);
		}
	}, [isAuthorized]);

	const alsoKnownAs = Array.isArray(person?.also_known_as) ? person.also_known_as : [];
	const movies = Array.isArray(person?.movies) ? person.movies as TPersonMovie[] : [];
	const shows = Array.isArray(person?.shows) ? person.shows as TPersonShow[] : [];
	const visibleMovies = useMemo(
		() => movies.filter(movie => (
			(!isOnlyMine || Boolean(movie.user_status)) &&
			(!isPrimaryOnly || isPrimaryWork(movie))
		)),
		[isOnlyMine, isPrimaryOnly, movies]
	);
	const visibleShows = useMemo(
		() => shows.filter(show => (
			(!isOnlyMine || Boolean(show.user_status)) &&
			(!isPrimaryOnly || isPrimaryWork(show))
		)),
		[isOnlyMine, isPrimaryOnly, shows]
	);
	const infoRows = [
		{label: 'Дата рождения', value: person?.birthday},
		{label: 'Дата смерти', value: person?.deathday},
		{label: 'Место рождения', value: person?.place_of_birth},
		{label: 'Также известен как', value: alsoKnownAs.join(', ')},
	].filter(item => Boolean(item.value));

	if (!person) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div
				className={bem.element('background')}
				style={{backgroundImage: person?.profile_path ? `url(${person.profile_path})` : 'none'}}
			/>

			<div className={bem.element('body')}>
				<section className={bem.element('header')}>
					<div className={bem.element('poster')}>
						{person?.profile_path ? (
							<img src={person.profile_path} alt={person.name} className={bem.element('poster-img')} />
						) : (
							<div className={bem.element('poster-placeholder')}>{person.name}</div>
						)}
					</div>

					<div className={bem.element('main')}>
						<div className={bem.element('title-row')}>
							<h1 className={bem.element('title')}>{person.name}</h1>
						</div>
						<div className={bem.element('info-list')}>
							{infoRows.map(item => (
								<div key={item.label} className={bem.element('info-row')}>
									<span className={bem.element('info-label')}>{item.label}</span>
									<span className={bem.element('info-value')}>{item.value}</span>
								</div>
							))}
						</div>
					</div>
				</section>

				<section className={bem.element('card')}>
					<h3 className={bem.element('card-title')}>Биография</h3>
					<div className={bem.element('biography')}>
						{person.biography || 'Биография пока отсутствует.'}
					</div>
				</section>

				<section className={bem.element('filters')}>
					{isAuthorized && (
						<button
							type='button'
							className={bem.element('filter-button', {active: isOnlyMine})}
							aria-pressed={isOnlyMine}
							onClick={() => setIsOnlyMine(value => !value)}
						>
							Только моё
						</button>
					)}
					<button
						type='button'
						className={bem.element('filter-button', {active: isPrimaryOnly})}
						aria-pressed={isPrimaryOnly}
						onClick={() => setIsPrimaryOnly(value => !value)}
					>
						Основные работы
					</button>
				</section>

				<div className={bem.element('credits-grid')}>
					<section className={bem.element('card')}>
						<h3 className={bem.element('card-title')}>Фильмы</h3>
						<div className={bem.element('movies')}>
							{visibleMovies.length > 0 ? (
								visibleMovies.map(movie => (
									<TmdbMediaCard
										key={movie.id}
										itemType='movie'
										className={bem.element('movie-card')}
										item={{
											id: movie.id,
											name: movie.name,
											original_name: movie.original_name,
											poster_path: movie.poster_path,
											release_date: movie.release_date,
											vote_average: movie.score !== null ? movie.score / 10 : undefined,
											user_score: movie.user_score,
										}}
										details={[
											{label: 'Роль', value: (movie.roles || []).map(role => ROLE_LABELS[role] || role).join(', ')},
											...(movie.character ? [{label: 'Персонаж', value: movie.character}] : []),
										]}
										statusBadge={movie.user_status ? STATUS_BADGE_MAP[movie.user_status] : undefined}
									/>
								))
							) : (
								<div className={bem.element('empty')}>
									{getEmptyWorksText('фильмов', isOnlyMine, isPrimaryOnly)}
								</div>
							)}
						</div>
					</section>

					<section className={bem.element('card')}>
						<h3 className={bem.element('card-title')}>Сериалы</h3>
						<div className={bem.element('movies')}>
							{visibleShows.length > 0 ? (
								visibleShows.map(show => (
									<TmdbMediaCard
										key={show.id}
										itemType='show'
										className={bem.element('movie-card')}
										item={{
											id: show.id,
											name: show.name,
											original_name: show.original_name,
											poster_path: show.poster_path,
											release_date: show.release_date,
											vote_average: show.score !== null ? show.score / 10 : undefined,
											user_score: show.user_score,
										}}
										details={[
											{label: 'Роль', value: (show.roles || []).map(role => ROLE_LABELS[role] || role).join(', ')},
											...(show.character ? [{label: 'Персонаж', value: show.character}] : []),
										]}
										statusBadge={show.user_status ? STATUS_BADGE_MAP[show.user_status] : undefined}
									/>
								))
							) : (
								<div className={bem.element('empty')}>
									{getEmptyWorksText('сериалов', isOnlyMine, isPrimaryOnly)}
								</div>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
