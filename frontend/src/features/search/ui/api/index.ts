import {gamesAutocomplete} from '@/entities/game';
import {moviesAutocomplete} from '@/entities/movie';
import {showsAutocomplete} from '@/entities/show';
import {usersAutocomplete} from '@/entities/user';

export async function fetchItemsAutocomplete(query?: string) {
    const games = await gamesAutocomplete(query);
    const movies = await moviesAutocomplete(query);
    const shows = await showsAutocomplete(query);
    const users = await usersAutocomplete(query);

    return {
        games,
        movies,
        shows,
        users,
    };
}
