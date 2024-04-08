import {gamesAutocomplete} from '@/entities/game';
import {moviesAutocomplete} from '@/entities/movie';
import {showsAutocomplete} from '@/entities/show';
import {usersAutocomplete} from '@/entities/user';
import {IGameAutocomplete} from '@/entities/game/model/interfaces';
import {IMovieAutocomplete} from '@/entities/movie/model/interfaces';
import {IShowAutocomplete} from '@/entities/show/model/interfaces';
import {IUserAutocomplete} from '@/entities/user/model/interfaces';

export async function fetchItemsAutocomplete(query?: string): Promise<{
    games: IGameAutocomplete[],
    movies: IMovieAutocomplete[],
    shows: IShowAutocomplete[],
    users: IUserAutocomplete[],
}> {
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
