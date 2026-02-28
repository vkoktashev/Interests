import React, {useMemo, useState} from 'react';
import ReactPlayer from 'react-player';
import {FaExpand} from 'react-icons/fa';
import {Carousel} from 'react-responsive-carousel';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Video from 'yet-another-react-lightbox/plugins/video';
import {useBem} from '@steroidsjs/core/hooks';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
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

type TLightboxSlide = {
	type: 'image' | 'video' | 'youtube';
	src?: string;
	thumbnail?: string;
	sources?: Array<{
		src: string;
		type?: string;
	}>;
};

const notNull = <T,>(value: T | null): value is T => value !== null;

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
	const [lightboxIndex, setLightboxIndex] = useState<number>(-1);

	const getYouTubeId = (url: string) => {
		const match = url.match(/[?&]v=([^&#]+)/i)
			|| url.match(/youtu\.be\/([^?&#/]+)/i)
			|| url.match(/youtube\.com\/embed\/([^?&#/]+)/i)
			|| url.match(/youtube\.com\/shorts\/([^?&#/]+)/i);
		return match?.[1] || null;
	};
	const getYouTubeEmbedUrl = (url: string) => {
		const videoId = getYouTubeId(url);
		if (!videoId) {
			return '';
		}
		return `https://www.youtube.com/embed/${videoId}`;
	};

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
			.filter(notNull);

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
			.filter(notNull);

		return [...trailerItems, ...screenshotItems];
	}, [trailers, screenshots]);

	const lightboxSlides = useMemo<TLightboxSlide[]>(() => {
		return mediaItems.map(item => {
			if (item.type === 'screenshot') {
				return {
					type: 'image',
					src: item.url,
					thumbnail: item.url,
				};
			}

			const youtubeId = getYouTubeId(item.url);
			if (youtubeId) {
				return {
					type: 'youtube',
					src: item.url,
					thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
				};
			}

			return {
				type: 'video',
				sources: [
					{
						src: item.url,
						type: 'video/mp4',
					},
				],
			};
		});
	}, [mediaItems]);

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
			<div className={bem.element('header')}>
				<h3 className={bem.element('title')}>{title}</h3>
				<button
					type='button'
					className={bem.element('open-gallery-button')}
					onClick={() => setLightboxIndex(0)}
					aria-label='Открыть галерею'
				>
					<FaExpand />
				</button>
			</div>

			<Carousel
				className={bem.element('carousel')}
				showArrows
				centerMode
				centerSlidePercentage={50}
				showThumbs={false}
				showStatus={false}
				showIndicators={false}
			>
				{mediaItems.map((item, index) => (
					<div className={bem.element('media-item')} key={item.key}>
						{item.type === 'trailer' ? (
							<div className={bem.element('trailer')}>
								{getYouTubeId(item.url) ? (
									<iframe
										src={getYouTubeEmbedUrl(item.url)}
										title={`trailer-${index}`}
										className={bem.element('trailer-player')}
										allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
										referrerPolicy='strict-origin-when-cross-origin'
										allowFullScreen
									/>
								) : (
									<ReactPlayer url={item.url} controls className={bem.element('trailer-player')} />
								)}
							</div>
						) : (
							<div
								className={bem.element('screenshot')}
								role='button'
								tabIndex={0}
								onClick={() => setLightboxIndex(index)}
								onKeyDown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										setLightboxIndex(index);
									}
								}}
							>
								<img src={item.url} alt='' className={bem.element('screenshot-image')} />
							</div>
						)}
					</div>
				))}
			</Carousel>

			<Lightbox
				open={lightboxIndex >= 0}
				close={() => setLightboxIndex(-1)}
				index={lightboxIndex < 0 ? 0 : lightboxIndex}
				slides={lightboxSlides as any}
				plugins={[Video, Thumbnails]}
				video={{
					autoPlay: false,
				}}
				thumbnails={{
					position: 'bottom',
					width: 112,
					height: 64,
					border: 0,
					borderRadius: 8,
					padding: 3,
					gap: 8,
				}}
				render={{
					slide: ({slide}) => {
						if ((slide as TLightboxSlide).type !== 'youtube') {
							return undefined;
						}

						const url = (slide as TLightboxSlide).src;
						if (!url) {
							return null;
						}

						return (
							<div className={bem.element('lightbox-youtube')}>
								<ReactPlayer url={url} controls className={bem.element('lightbox-player')} />
							</div>
						);
					},
				}}
			/>
		</div>
	);
}
