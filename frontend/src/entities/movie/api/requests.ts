import api from '@/shared/api';
import {IMovieAutocomplete} from '@/entities/movie/model/interfaces';

export async function moviesAutocomplete(query?: string): Promise<IMovieAutocomplete[]> {
    try {
        const result = await api.get<IMovieAutocomplete[]>('movies/search/', {params: {query}});
        return result.data;
    } catch (e) {
        console.error(e);
        return [];
    }
}
