import api from '@/shared/api';
import {IShowAutocomplete} from '@/entities/show/model/interfaces';

export async function showsAutocomplete(query?: string): Promise<IShowAutocomplete[]> {
    try {
        const result = await api.get<IShowAutocomplete[]>('shows/search/', {params: {query}});
        return result.data;
    } catch (e) {
        console.error(e);
        return [];
    }
}
