import api from '@/shared/api';
import {IUserAutocomplete} from '@/entities/user/model/interfaces';

export async function usersAutocomplete(query?: string): Promise<IUserAutocomplete[]> {
    try {
        const result = await api.get<IUserAutocomplete[]>('users/search/', {params: {query}});
        return result.data;
    } catch (e) {
        console.error(e);
        return [];
    }
}
