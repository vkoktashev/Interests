export type TMediaType = 'game' | 'movie' | 'show';
export type TMediaStatusTone = 'planned' | 'done' | 'progress' | 'stopped' | 'earlyAccess';

export interface IMediaStatusBadge {
	label: string;
	tone: TMediaStatusTone;
}

const GAME_RELEASE_STATUS_BADGES: Record<string, IMediaStatusBadge> = {
	alpha: {label: 'Alpha', tone: 'earlyAccess'},
	beta: {label: 'Beta', tone: 'earlyAccess'},
	'early access': {label: 'Early Access', tone: 'earlyAccess'},
};

const STATUS_TONES_BY_LABEL: Record<string, TMediaStatusTone> = {
	'Буду играть': 'planned',
	'Буду смотреть': 'planned',
	'Прошел': 'done',
	'Посмотрел': 'done',
	'Пройдено': 'done',
	'Просмотрено': 'done',
	'Играю': 'progress',
	'Смотрю': 'progress',
	'Не играл': 'progress',
	'Не смотрел': 'progress',
	'Дропнул': 'stopped',
	'Дропнуто': 'stopped',
};

export function getMediaStatusToneByLabel(label?: string | null): TMediaStatusTone | null {
	return label ? STATUS_TONES_BY_LABEL[label] || null : null;
}

export function getMediaStatusBadgeByLabel(label?: string | null): IMediaStatusBadge | null {
	const tone = getMediaStatusToneByLabel(label);
	return label && tone ? {label, tone} : null;
}

export function getUserStatusBadge(type: TMediaType, status?: string | null): IMediaStatusBadge | null {
	if (status === 'going') {
		return {
			label: type === 'game' ? 'Буду играть' : 'Буду смотреть',
			tone: 'planned',
		};
	}
	if ((type === 'game' && status === 'completed') || (type !== 'game' && status === 'watched')) {
		return {
			label: type === 'game' ? 'Пройдено' : 'Просмотрено',
			tone: 'done',
		};
	}
	if ((type === 'game' && status === 'playing') || (type === 'show' && status === 'watching')) {
		return {
			label: type === 'game' ? 'Играю' : 'Смотрю',
			tone: 'progress',
		};
	}
	if (status === 'stopped') {
		return {
			label: 'Дропнуто',
			tone: 'stopped',
		};
	}
	return null;
}

export function getGameReleaseStatusBadge(status?: string | null): IMediaStatusBadge | null {
	const normalizedStatus = (status || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
	return GAME_RELEASE_STATUS_BADGES[normalizedStatus] || null;
}
