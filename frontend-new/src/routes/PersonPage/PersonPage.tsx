import React, {useEffect, useMemo} from 'react';

import './person-page.scss';
import {useBem, useSelector, useFetch} from '@steroidsjs/core/hooks';
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

export function PersonPage() {
	const bem = useBem('person-page');
	const personId = useSelector(state => getRouteParam(state, 'personId'));

	const fetchConfig = useMemo(() => personId && ({
		url: `/people/person/${personId}/`,
		method: 'get',
	}), [personId]);

	const {data: person} = useFetch(fetchConfig);

	useEffect(() => {
		document.title = person?.name ? `${person.name} — Interests` : 'Interests';
	}, [person?.name]);

	if (!person) {
		return <Loader />;
	}

	const alsoKnownAs = Array.isArray(person.also_known_as) ? person.also_known_as : [];
	const infoRows = [
		{label: 'Дата рождения', value: person.birthday},
		{label: 'Дата смерти', value: person.deathday},
		{label: 'Место рождения', value: person.place_of_birth},
		{label: 'Также известен как', value: alsoKnownAs.join(', ')},
	].filter(item => Boolean(item.value));

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

				<div className={bem.element('credits-grid')}>
					<section className={bem.element('card')}>
						<h3 className={bem.element('card-title')}>Фильмы</h3>
						<div className={bem.element('movies')}>
							{(person.movies || []).length > 0 ? (
								(person.movies as TPersonMovie[]).map(movie => (
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
								<div className={bem.element('empty')}>Фильмы с этим человеком пока не найдены.</div>
							)}
						</div>
					</section>

					<section className={bem.element('card')}>
						<h3 className={bem.element('card-title')}>Сериалы</h3>
						<div className={bem.element('movies')}>
							{(person.shows || []).length > 0 ? (
								(person.shows as TPersonShow[]).map(show => (
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
								<div className={bem.element('empty')}>Сериалы с этим человеком пока не найдены.</div>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
