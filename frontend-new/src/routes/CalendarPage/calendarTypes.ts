export interface ICalendarGame {
	id: number;
	name: string;
	slug: string;
}

export interface ICalendarMovie {
	tmdb_id: number;
	tmdb_name: string;
}

export interface ICalendarEpisode {
	tmdb_id: number;
	tmdb_season_number: number;
	tmdb_episode_number: number;
	tmdb_show: {
		tmdb_id: number;
		tmdb_name: string;
	};
}

export interface ICalendarDay {
	games: ICalendarGame[];
	movies: ICalendarMovie[];
	episodes: ICalendarEpisode[];
}

export type TCalendarMap = Record<string, ICalendarDay>;

export type TCalendarEntry = [string, ICalendarDay];

export const EMPTY_CALENDAR_DAY: ICalendarDay = {
	games: [],
	movies: [],
	episodes: [],
};
