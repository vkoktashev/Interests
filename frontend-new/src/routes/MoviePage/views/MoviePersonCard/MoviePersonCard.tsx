import React from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';

import {ROUTE_PERSON} from '../../..';
import {getDefaultAvatarUrl} from '../../../../shared/avatar';

import './movie-person-card.scss';

export interface IMoviePerson {
	id: number;
	tmdb_id: number;
	name: string;
	profile_path?: string;
	character?: string;
}

interface IMoviePersonCardProps {
	person: IMoviePerson;
	subtitle?: string;
	compact?: boolean;
	className?: string;
	onClick?: () => void;
}

export default function MoviePersonCard(props: IMoviePersonCardProps) {
	const bem = useBem('movie-person-card');
	const subtitle = props.subtitle || props.person.character || '';
	const avatarUrl = props.person.profile_path || getDefaultAvatarUrl(props.person.name || props.person.id);

	return (
		<Link
			className={[bem.block({compact: props.compact}), props.className].filter(Boolean).join(' ')}
			toRoute={ROUTE_PERSON}
			toRouteParams={{personId: props.person.id}}
			onClick={props.onClick}
		>
			<span className={bem.element('portrait')}>
				<img
					className={bem.element('avatar')}
					src={avatarUrl}
					alt={props.person.name}
					loading='lazy'
				/>
			</span>
			<span className={bem.element('info')}>
				<span className={bem.element('name')}>{props.person.name}</span>
				{subtitle && <span className={bem.element('subtitle')}>{subtitle}</span>}
			</span>
		</Link>
	);
}
