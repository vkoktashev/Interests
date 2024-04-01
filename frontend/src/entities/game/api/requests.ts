import api from '@/shared/api';
import {IGame, IGameAutocomplete} from '@/entities/game/model/interfaces';

export async function gamesAutocomplete(query?: string): Promise<IGameAutocomplete[]> {
    try {
        const result = await api.get<IGameAutocomplete[]>('games/search/', {params: {query}});
        return result.data;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getGame(slug: string): Promise<IGame> {
    const result = await api.get<IGame>(`games/game/${slug}`);
    return result.data;
}
