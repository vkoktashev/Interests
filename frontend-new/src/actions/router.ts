import {push, replace} from 'connected-react-router';

export const goToRouteWithParams = (routeId, params: RouteParams = null, isReplace = false) => (dispatch, getState, {store}) => {
    const getRouteProp = require('@steroidsjs/core/reducers/router').getRouteProp;
    const buildUrl = require('@steroidsjs/core/reducers/router').buildUrl;
    const path = getRouteProp(getState(), routeId, 'path');
    const routeUrl = buildUrl(path, params);
    const reduxAction = isReplace ? replace(routeUrl) : push(routeUrl);
    return dispatch(reduxAction);
};
