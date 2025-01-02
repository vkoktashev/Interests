import {IRouteItem} from '@steroidsjs/core/ui/nav/Router/Router';
import HomePage from './HomePage';
import GamePage from './GamePage';

export const ROUTE_ROOT = 'root';

export const ROUTE_USER = 'user';
export const ROUTE_SEARCH = 'search';

export const ROUTE_GAME = 'game';
export const ROUTE_MOVIE = 'movie';
export const ROUTE_SHOW = 'show';

export const ROUTE_UNWATCHED = 'unwatched';
export const ROUTE_RANDOMIZER = 'randomizer';

export const ROUTE_SETTINGS = 'settings';
export const ROUTE_CALENDAR = 'calendar';

const roles = [null];

export default {
    id: ROUTE_ROOT,
    exact: true,
    path: '/',
    component: HomePage,
    roles,
    items: {
      [ROUTE_GAME]: {
          exact: true,
          path: '/game/:gameId',
          component: GamePage,
          roles,
      },
    },
} as IRouteItem;
