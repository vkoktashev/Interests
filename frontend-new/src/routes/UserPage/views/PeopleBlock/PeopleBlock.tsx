import React, {useState} from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';

import {ROUTE_MOVIE, ROUTE_PERSON, ROUTE_SHOW} from '../../../index';
import './people-block.scss';

interface ITrackedProject {
	type: typeof ROUTE_MOVIE | typeof ROUTE_SHOW;
	id: number;
	name: string;
	year?: number | null;
}

interface ITrackedPerson {
	id: number;
	name: string;
	profile_path?: string;
	life_years?: string;
	projects?: ITrackedProject[];
}

interface IPeopleBlockProps {
	people: ITrackedPerson[];
}

const VISIBLE_PROJECTS_COUNT = 3;

function getProjectRouteParams(project: ITrackedProject) {
	return project.type === ROUTE_MOVIE
		? {movieId: project.id}
		: {showId: project.id};
}

function getProjectsCountLabel(count: number): string {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return `${count} проектов`;
	}
	if (lastDigit === 1) {
		return `${count} проект`;
	}
	if (lastDigit >= 2 && lastDigit <= 4) {
		return `${count} проекта`;
	}
	return `${count} проектов`;
}

function PeopleBlock({people}: IPeopleBlockProps) {
	const bem = useBem('profile-people');
	const [expandedPeople, setExpandedPeople] = useState<Set<number>>(new Set());

	if (!people.length) {
		return (
			<div className={bem.element('empty')}>
				Отслеживаемых людей пока нет
			</div>
		);
	}

	return (
		<div className={bem.block()}>
			{people.map(person => {
				const projects = person.projects || [];
				const isExpanded = expandedPeople.has(person.id);
				const visibleProjects = isExpanded ? projects : projects.slice(0, VISIBLE_PROJECTS_COUNT);
				const hiddenProjectsCount = projects.length - visibleProjects.length;
				const toggleProjects = () => setExpandedPeople(currentPeople => {
					const nextPeople = new Set(currentPeople);
					if (nextPeople.has(person.id)) {
						nextPeople.delete(person.id);
					} else {
						nextPeople.add(person.id);
					}
					return nextPeople;
				});

				return (
					<article className={bem.element('card')} key={person.id}>
						<Link
							toRoute={ROUTE_PERSON}
							toRouteParams={{personId: person.id}}
							className={bem.element('portrait-link')}
							title={person.name}
						>
							{person.profile_path ? (
								<img
									className={bem.element('portrait')}
									src={person.profile_path}
									alt={person.name}
								/>
							) : (
								<div className={bem.element('portrait-placeholder')}>
									{person.name?.charAt(0).toUpperCase() || '?'}
								</div>
							)}
						</Link>

						<div className={bem.element('content')}>
							<div className={bem.element('person-info')}>
								<Link
									toRoute={ROUTE_PERSON}
									toRouteParams={{personId: person.id}}
									className={bem.element('name')}
								>
									{person.name || 'Без имени'}
								</Link>
								<div className={bem.element('years')}>
									{person.life_years || 'Годы жизни неизвестны'}
								</div>
							</div>

							<div className={bem.element('known-for')}>
								<div className={bem.element('known-for-header')}>
									<div className={bem.element('known-for-title')}>Известен вам по</div>
									{projects.length > 0 && (
										<div className={bem.element('projects-count')}>
											{getProjectsCountLabel(projects.length)}
										</div>
									)}
								</div>
								{visibleProjects.length ? (
									<div className={bem.element('projects')}>
										{visibleProjects.map(project => (
											<Link
												key={`${project.type}-${project.id}`}
												toRoute={project.type}
												toRouteParams={getProjectRouteParams(project)}
												className={bem.element('project')}
												title={project.name}
											>
												{project.name}{project.year ? ` (${project.year})` : ''}
											</Link>
										))}
										{hiddenProjectsCount > 0 && (
											<button
												type='button'
												className={bem.element('more')}
												onClick={toggleProjects}
											>
												и ещё {hiddenProjectsCount}
											</button>
										)}
										{isExpanded && projects.length > VISIBLE_PROJECTS_COUNT && (
											<button
												type='button'
												className={bem.element('more')}
												onClick={toggleProjects}
											>
												Свернуть
											</button>
										)}
									</div>
								) : (
									<div className={bem.element('no-projects')}>
										Нет отмеченных проектов с этим человеком
									</div>
								)}
							</div>
						</div>
					</article>
				);
			})}
		</div>
	);
}

export default PeopleBlock;
