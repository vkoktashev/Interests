import React from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';

import {ROUTE_PERSON} from '../../routes';
import {getDefaultAvatarUrl} from '../avatar';

import './person-card.scss';

export interface IPersonCardItem {
	id: number;
	tmdb_id: number;
	name: string;
	profile_path?: string;
	character?: string;
	episode_count?: number;
}

interface IPersonCardProps {
	person: IPersonCardItem;
	subtitle?: string;
	compact?: boolean;
	className?: string;
	onClick?: () => void;
}

export default function PersonCard(props: IPersonCardProps) {
	const bem = useBem('person-card');
	const subtitle = getPersonSubtitle(props.person, props.subtitle);
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

function getPersonSubtitle(person: IPersonCardItem, subtitle?: string) {
	const parts = [subtitle || person.character || ''];
	if (person.episode_count) {
		parts.push(getEpisodesCountLabel(person.episode_count));
	}
	return parts.filter(Boolean).join(' · ');
}

function getEpisodesCountLabel(count: number) {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return `${count} эпизодов`;
	}
	if (lastDigit === 1) {
		return `${count} эпизод`;
	}
	if (lastDigit >= 2 && lastDigit <= 4) {
		return `${count} эпизода`;
	}
	return `${count} эпизодов`;
}
