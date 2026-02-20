export interface IGenreStat {
	name: string | null;
	spent_time_percent: number;
}

export interface IYearStat {
	year: number | null;
	count: number;
}

export interface ICategoryStats {
	count: number;
	total_spent_time: number;
	genres: IGenreStat[];
	years: IYearStat[];
}

export interface IUserStats {
	games?: ICategoryStats;
	movies?: ICategoryStats;
	episodes?: ICategoryStats;
}
