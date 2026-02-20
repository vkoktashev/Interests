import React from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';
import Image from '../../../../shared/Image';
import {ISearchCardData} from '../searchTypes';
import './search-card.scss';

interface ISearchCardProps {
	info: ISearchCardData;
	className?: string;
}

function SearchCard({info, className}: ISearchCardProps) {
	const bem = useBem('search-card');
	const hasPosterUrl = Boolean(info.poster?.includes('url('));
	const hasPosterImage = Boolean(info.poster) && !hasPosterUrl;
	const hasDetails = Boolean(info.genres || info.tags || info.platforms || info.overview);

	return (
		<div className={bem(bem.block(), className)}>
			<Link
				toRoute={info.route}
				toRouteParams={info.routeParams}
				title={info.name}
				className={bem.element('link')}
			>
				{hasPosterUrl ? (
					<div className={bem.element('poster')} style={{backgroundImage: info.poster}} />
				) : hasPosterImage ? (
					<Image className={bem.element('poster')} src={info.poster} alt={info.name} />
				) : (
					<div className={bem.element('poster-placeholder')} />
				)}

				<div className={bem.element('body')}>
					<h4 className={bem.element('name')}>{info.name}</h4>
					{info.releaseDate && (
						<p className={bem.element('date')}>
							{info.releaseDate}
						</p>
					)}
				</div>
			</Link>

			{hasDetails && (
				<div className={bem.element('details')}>
					{info.genres && (
						<p className={bem.element('detail-row')}>
							<span className={bem.element('detail-title')}>Жанры:</span> {info.genres}
						</p>
					)}
					{info.tags && (
						<p className={bem.element('detail-row')}>
							<span className={bem.element('detail-title')}>Теги:</span> {info.tags}
						</p>
					)}
					{info.platforms && (
						<p className={bem.element('detail-row')}>
							<span className={bem.element('detail-title')}>Платформы:</span> {info.platforms}
						</p>
					)}
					{info.overview && (
						<p className={bem.element('detail-row')}>
							{info.overview}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

export default SearchCard;
