// eslint-disable-next-line import/no-extraneous-dependencies
import {combineReducers} from 'redux';
import {
    form,
    auth,
    fields,
    list,
    notifications,
    router,
} from '@steroidsjs/core/reducers';
import modals from './modals';

export default (asyncReducers: any) => combineReducers({
    form,
    auth,
    fields,
    list,
    notifications,
    router,
    modals,
    ...asyncReducers,
});
