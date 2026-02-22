import {IRouteItem} from '@steroidsjs/core/ui/nav/Router/Router';
import HomePage from './HomePage';
import GamePage from './GamePage';
import MoviePage from './MoviePage';
import SettingsPage from './SettingsPage';
import RandomPage from './RandomPage/RandomPage';
import CalendarPage from './CalendarPage';
import UnwatchedPage from './UnwatchedPage';
import ConfirmPage from './ConfirmPage';
import ConfirmPasswordPage from './ConfirmPasswordPage';
import NotFoundPage from './NotFoundPage';
import SearchPage from './SearchPage';
import UserPage from './UserPage';
import ShowPage from './ShowPage';
import ShowEpisodePage from './ShowEpisodePage';
import ShowSeasonPage from './ShowSeasonPage';
import FAQPage from './FAQPage';

export const ROUTE_ROOT = 'root';

export const ROUTE_USER = 'user';
export const ROUTE_SEARCH = 'search';

export const ROUTE_GAME = 'game';
export const ROUTE_MOVIE = 'movie';
export const ROUTE_SHOW = 'show';
export const ROUTE_SHOW_SEASON = 'show_season';
export const ROUTE_SHOW_EPISODE = 'show_episode';

export const ROUTE_UNWATCHED = 'unwatched';
export const ROUTE_RANDOMIZER = 'randomizer';

export const ROUTE_SETTINGS = 'settings';
export const ROUTE_CALENDAR = 'calendar';
export const ROUTE_FAQ = 'faq';

export const ROUTE_EMAIL_CONFIRM = 'email_confirm';
export const ROUTE_PASSWORD_CONFIRM = 'password_confirm';

export const NOT_FOUND = 'not_found';

const roles = [null];

export default {
    id: ROUTE_ROOT,
    exact: true,
    path: '/',
    component: HomePage,
    title: __('Interests'),
    roles,
    items: {
      [ROUTE_GAME]: {
          exact: true,
          path: '/game/:gameId',
          component: GamePage,
          title: __('Игра'),
          roles,
      },
        [ROUTE_MOVIE]: {
            exact: true,
            path: '/movie/:movieId',
            component: MoviePage,
            title: __('Фильм'),
            roles,
        },
        [ROUTE_SETTINGS]: {
            exact: true,
            path: '/settings',
            component: SettingsPage,
            title: __('Настройки'),
            roles,
        },
        [ROUTE_RANDOMIZER]: {
            exact: true,
            path: '/random',
            component: RandomPage,
            title: __('Рандомайзер'),
            roles,
        },
        [ROUTE_CALENDAR]: {
            exact: true,
            path: '/calendar',
            component: CalendarPage,
            title: __('Календарь'),
            roles,
        },
        [ROUTE_FAQ]: {
            exact: true,
            path: '/faq',
            component: FAQPage,
            title: __('FAQ'),
            roles,
        },
        [ROUTE_UNWATCHED]: {
            exact: true,
            path: '/unwatched',
            component: UnwatchedPage,
            title: __('Непросмотренное'),
            roles,
        },
        [ROUTE_EMAIL_CONFIRM]: {
            exact: true,
            path: '/confirm/',
            component: ConfirmPage,
            title: __('Подтверждение почты'),
            roles,
        },
        [ROUTE_PASSWORD_CONFIRM]: {
            exact: true,
            path: '/confirm_password/',
            component: ConfirmPasswordPage,
            title: __('Подтверждение пароля'),
            roles,
        },
        [ROUTE_SEARCH]: {
            // exact: true,
            path: '/search',
            title: __('Поиск'),
            component: SearchPage,
            roles,
        },
        [ROUTE_USER]: {
            exact: true,
            path: '/user/:userId',
            title: __('Пользователь'),
            component: UserPage,
            roles,
        },
        [ROUTE_SHOW]: {
            exact: true,
            path: '/show/:showId',
            title: __('Сериал'),
            component: ShowPage,
            roles,
        },
        [ROUTE_SHOW_SEASON]: {
            exact: true,
            path: `/show/:showId/season/:showSeasonId`,
            title: __('Сезон сериала'),
            component: ShowSeasonPage,
            roles,
        },
        [ROUTE_SHOW_EPISODE]: {
            exact: true,
            path: `/show/:showId/season/:showSeasonId/episode/:showEpisodeId`,
            title: __('Серия сериала'),
            component: ShowEpisodePage,
            roles,
        },
        [NOT_FOUND]: {
            exact: false,
            path: '*',
            role: '404',
            title: __('404'),
            component: NotFoundPage,
            // roles,
        },
    },
} as IRouteItem;
