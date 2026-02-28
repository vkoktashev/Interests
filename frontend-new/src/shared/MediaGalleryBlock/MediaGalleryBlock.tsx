import React, {useMemo} from 'react';
import ReactPlayer from 'react-player';
import {Carousel} from 'react-responsive-carousel';
import {useBem} from '@steroidsjs/core/hooks';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './media-gallery-block.scss';

type TTrailer = {
	id?: number | string;
	url?: string;
	name?: string;
	data?: {
		max?: string;
		'480'?: string;
		'320'?: string;
	};
};

type TScreenshot = {
	id?: number | string;
	image?: string;
	width?: number;
	height?: number;
};
type TMediaItem = {
	type: 'trailer' | 'screenshot';
	key: string;
	url: string;
};

interface IMediaGalleryBlockProps {
	className?: string;
	trailers?: TTrailer[];
	screenshots?: TScreenshot[];
	isMobileViewport?: boolean;
}

export default function MediaGalleryBlock(props: IMediaGalleryBlockProps) {
	const bem = useBem('media-gallery-block');
	const trailers = props.trailers || [];
	const screenshots = props.screenshots || [];

	const mediaItems = useMemo(() => {
		const trailerItems = trailers
			.map((video, index) => {
				const videoUrl = video?.url || video?.data?.max || video?.data?.['480'] || video?.data?.['320'];
				if (!videoUrl) {
					return null;
				}
				return {
					type: 'trailer' as const,
					key: `trailer-${video?.id || videoUrl}-${index}`,
					url: videoUrl,
				};
			})
			.filter((item): item is TMediaItem => Boolean(item));

		const screenshotItems = screenshots
			.map((screenshot, index) => {
				const imageUrl = screenshot?.image;
				if (!imageUrl) {
					return null;
				}
				return {
					type: 'screenshot' as const,
					key: `screenshot-${screenshot?.id || imageUrl}-${index}`,
					url: imageUrl,
				};
			})
			.filter((item): item is TMediaItem => Boolean(item));

		return [...trailerItems, ...screenshotItems];
	}, [trailers, screenshots]);

	const rootClassName = useMemo(
		() => [bem.block(), props.className].filter(Boolean).join(' '),
		[bem, props.className],
	);

	const title = useMemo(() => {
		if (trailers.length > 0 && screenshots.length > 0) {
			return 'Медиа';
		}
		if (trailers.length > 0) {
			return 'Трейлеры';
		}
		return 'Скриншоты';
	}, [trailers.length, screenshots.length]);

	if ((!mediaItems.length) || props.isMobileViewport) {
		return null;
	}

	return (
		<div className={rootClassName}>
			<h3 className={bem.element('title')}>{title}</h3>

			<Carousel
				className={bem.element('carousel')}
				showArrows
				centerMode
				centerSlidePercentage={50}
				showThumbs={false}
				showStatus={false}
				showIndicators={false}
			>
				{mediaItems.map(item => (
					<div className={bem.element('media-item')} key={item.key}>
						<div className={bem.element('media-type')}>
							{item.type === 'trailer' ? 'Трейлер' : 'Скриншот'}
						</div>
						{item.type === 'trailer' ? (
							<div className={bem.element('trailer')}>
								<ReactPlayer url={item.url} controls className={bem.element('trailer-player')} />
							</div>
						) : (
							<div className={bem.element('screenshot')}>
								<img src={item.url} alt='' className={bem.element('screenshot-image')} />
							</div>
						)}
					</div>
				))}
			</Carousel>
		</div>
	);
}
