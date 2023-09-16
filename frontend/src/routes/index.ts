import {IRouteItem} from '@steroidsjs/core/ui/nav/Router/Router';
import IndexPage from './IndexPage';
import GamePage from './GamePage';
import MoviePage from './MoviePage';
import ShowPage from './ShowPage';

export const ROUTE_ROOT = 'root';
export const ROUTE_GAME = 'game';
export const ROUTE_MOVIE = 'movie';
export const ROUTE_SHOW = 'show';

const roles = [null];

export default {
    id: ROUTE_ROOT,
    exact: true,
    path: '/',
    component: IndexPage,
    roles,
    items: {
        [ROUTE_GAME]: {
            path: '/game/:id',
            exact: true,
            label: __('Игра'),
            roles: [null],
            component: GamePage,
        },
        [ROUTE_MOVIE]: {
            path: '/movie/:id',
            exact: true,
            label: __('Фильм'),
            roles: [null],
            component: MoviePage,
        },
        [ROUTE_SHOW]: {
            path: '/show/:id',
            exact: true,
            label: __('Сериал'),
            roles: [null],
            component: ShowPage,
        },
    }
} as IRouteItem;
