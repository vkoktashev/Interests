export interface IGameStore {
    domain: string,
    games_count: number,
    id: number,
    image_background: string,
    name: string,
    slug: string,
}

export interface IGameStoreItem {
    id: number,
    url: string,
    store: IGameStore,
}
