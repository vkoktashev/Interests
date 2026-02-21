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

export interface IPersonalityScoreStat {
	name: string;
	points: number;
}

export interface IStatusFunnelCategory {
	planned: number;
	in_progress: number;
	completed: number;
	dropped: number;
}

export interface IStatusFunnel {
	games: IStatusFunnelCategory;
	movies: IStatusFunnelCategory;
	shows: IStatusFunnelCategory;
}

export interface IScoreDistributionItem {
	score: number;
	count: number;
}

export interface IScoreCategoryStats {
	average: number;
	distribution: IScoreDistributionItem[];
}

export interface IScoresStats {
	overall_average: number;
	games: IScoreCategoryStats;
	movies: IScoreCategoryStats;
	shows: IScoreCategoryStats;
}

export interface ITimeDistribution {
	games: number;
	movies: number;
	episodes: number;
}

export interface IUserStats {
	games?: ICategoryStats;
	movies?: ICategoryStats;
	episodes?: ICategoryStats;
	top_actors?: IPersonalityScoreStat[];
	top_directors?: IPersonalityScoreStat[];
	status_funnel?: IStatusFunnel;
	scores?: IScoresStats;
	time_distribution_last_year?: ITimeDistribution;
}
