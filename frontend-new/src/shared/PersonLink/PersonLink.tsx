import React from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';

import {ROUTE_PERSON} from '../../routes';
import './person-link.scss';

interface IPersonLinkProps {
	id: number;
	name: string;
	className?: string;
}

export default function PersonLink({id, name, className}: IPersonLinkProps) {
	const bem = useBem('person-link');

	return (
		<Link
			className={bem(bem.block(), className)}
			toRoute={ROUTE_PERSON}
			toRouteParams={{personId: id}}
		>
			{name}
		</Link>
	);
}
