import {IRouteItem} from '@steroidsjs/core/ui/nav/Router/Router';
import HomePage from './HomePage';

export const ROUTE_ROOT = 'root';

export const ROUTE_USER = 'user';
export const ROUTE_SEARCH = 'search';

export const ROUTE_GAME = 'game';
export const ROUTE_MOVIE = 'movie';
export const ROUTE_SHOW = 'show';

const roles = [null];

export default {
    id: ROUTE_ROOT,
    exact: true,
    path: '/',
    component: HomePage,
    roles,
} as IRouteItem;
