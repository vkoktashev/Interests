import React from 'react';
import {Link} from '@steroidsjs/core/ui/nav';
import {useBem} from '@steroidsjs/core/hooks';
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
	const hasDetails = Boolean(info.genres || info.platforms || info.overview);
	const isMediaCard = info.layoutVariant === 'media';

	return (
		<div className={bem(bem.block({media: isMediaCard}), className)}>
			<Link
				toRoute={info.route}
				toRouteParams={info.routeParams}
				title={info.name}
				className={bem.element('link')}
			>
				{hasPosterUrl ? (
					<div className={bem.element('poster')} style={{backgroundImage: info.poster}} />
				) : hasPosterImage ? (
					<img className={bem.element('poster')} src={info.poster} alt={info.name} />
				) : (
					<div className={bem.element('poster-placeholder')} />
				)}

				<div className={bem.element('body')}>
					<div className={bem.element('body-main')}>
						<h4 className={bem.element('name')}>{info.name}</h4>
						{hasDetails && (
							<div className={bem.element('details')}>
								{info.genres && (
									<p className={bem.element('detail-row')}>
										<span className={bem.element('detail-title')}>Жанры:</span> {info.genres}
									</p>
								)}
								{info.platforms && (
									<p className={bem.element('detail-row', {platforms: true})}>
										<span className={bem.element('detail-title')}>Платформы:</span> {info.platforms}
									</p>
								)}
								{info.overview && (
									<p className={bem.element('detail-row', {overview: true})}>
										{info.overview}
									</p>
								)}
							</div>
						)}
					</div>

					{(info.releaseDate || info.kindLabel) && (
						<div className={bem.element('meta')}>
							{info.releaseDate ? (
								<p className={bem.element('date')}>
									{info.releaseDate}
								</p>
							) : (
								<span />
							)}
							{info.kindLabel && (
								<span className={bem.element('kind')}>
									{info.kindLabel}
								</span>
							)}
						</div>
					)}
				</div>
			</Link>
		</div>
	);
}

export default SearchCard;
