export interface IGamePriceStore {
    id: number,
    name: string,
    slug: string,
}

export interface IGamePriceItem {
    currency: string,
    discount_percent: number,
    final: number,
    formatted_final: string,
    formatted_initial: string,
    initial: number,
    region: string,
    region_label: string,
    store: IGamePriceStore,
    url: string,
}

export interface IGamePricesResponse {
    items: IGamePriceItem[],
    slug: string,
}
