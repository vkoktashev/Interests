export type TMediaType = 'game' | 'movie' | 'show';
export type TMediaStatusTone = 'planned' | 'done' | 'progress' | 'stopped';

export interface IMediaStatusBadge {
	label: string;
	tone: TMediaStatusTone;
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
