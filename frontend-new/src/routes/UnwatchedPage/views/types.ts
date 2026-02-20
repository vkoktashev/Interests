export interface IUnwatchedEpisode {
	tmdb_id: number;
	tmdb_episode_number: number;
	tmdb_name: string;
	tmdb_release_date?: string;
}

export interface IUnwatchedSeason {
	tmdb_id: number;
	tmdb_name: string;
	tmdb_season_number: number;
	episodes: IUnwatchedEpisode[];
}

export interface IUnwatchedShow {
	tmdb_id: number;
	tmdb_name: string;
	tmdb_poster_path?: string;
	seasons: IUnwatchedSeason[];
}

export interface ISetEpisodesPayload {
	episodes: Array<{
		tmdb_id: number;
		score: number;
	}>;
}
