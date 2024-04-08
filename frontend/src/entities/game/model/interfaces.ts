export interface IGameAutocomplete {
    hltb_id: number,
    hltb_name: string,
    rawg_backdrop_path: string,
    rawg_id: number,
    rawg_name: string,
    rawg_poster_path: string,
    rawg_release_date: string,
    rawg_slug: string,
    rawg_tba: boolean,
}

interface IGameStore {
    domain: string,
    games_count: number,
    id: number,
    image_background: string,
    name: string,
    slug: string,
}

export interface IGameInStore {
    id: number,
    store: IGameStore,
    url: string,
}

interface IGameHLTB {
    all_styles: number,
    completionist: number,
    game_alias: string,
    game_id: number,
    game_image_url: string,
    game_name: string,
    game_type: string,
    game_web_link: string,
    gameplay_completionist: number,
    gameplay_completionist_unit: string,
    gameplay_main: number,
    gameplay_main_extra: number,
    gameplay_main_extra_unit: string,
    gameplay_main_unit: string,
    json_content: any,
    main_extra: number,
    main_story: number,
    profile_dev: string,
    profile_platforms: string[],
    release_world: number,
    review_score: number,
    similarity: number,
}

export interface IGame {
    background: string,
    developers: string,
    genres: string,
    hltb: IGameHLTB,
    metacritic: number,
    name: string,
    overview: string,
    platforms: string,
    playtime: string,
    poster: string,
    release_date?: string,
    slug: string,
    stores: IGameInStore[],
}
