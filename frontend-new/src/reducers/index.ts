// eslint-disable-next-line import/no-extraneous-dependencies
import {combineReducers} from 'redux';
import {
    form,
    auth,
    fields,
    list,
    notifications,
    router,
    modal,
} from '@steroidsjs/core/reducers';
import projectModals from './modals';

export default (asyncReducers: any) => combineReducers({
    form,
    auth,
    fields,
    list,
    notifications,
    modal,
    // router,
    projectModals,
    ...asyncReducers,
    router: (state, action) => router(asyncReducers.router ? asyncReducers.router(state, action) : {}, action),
});
