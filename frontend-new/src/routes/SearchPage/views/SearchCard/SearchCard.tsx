import React from "react";
import './search-card.scss';
import Image from '../../../../shared/Image';
import {useBem} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';

function SearchCard({ info, className }) {
	const bem = useBem('search-card');

	return (
		<div className={bem(bem.block(), className)}>
			<Link
				toRoute={info.route}
				toRouteParams={info.routeParams}
				title={info.name}
				className={bem.element('link')}
			>
				{
					info.poster?.includes('url(')
						? (<div className='search-card__poster' style={{ backgroundImage: info.poster }} />)
						: (<Image className='search-card__poster' src={info.poster} />)
				}
				<div className='search-card__body'>
					<div className='search-card__name'>
						<h4>{info.name}</h4>
					</div>
					<p className='search-card__date'>{info.release_date}</p>
				</div>
			</Link>
			<div className='search-card__wrapper'>
				<p className='search-card__genres' hidden={!info.genres}>
					Жанр: {info.genres}
				</p>
				<p className='search-card__tags' hidden={!info.tags}>
					Теги: {info.tags}
				</p>
				<p className='search-card__platfroms' hidden={!info.platforms}>
					Платформы: {info.platforms}
				</p>
				<p className='search-card__overview' hidden={!info.overview}>
					{info.overview}
				</p>
			</div>
		</div>
	);
}

export default SearchCard;
