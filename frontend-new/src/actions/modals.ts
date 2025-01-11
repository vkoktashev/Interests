import {
    CLOSE_SIDEBAR, COLLAPSE_SIDEBAR, getSidebarIsCollapsed,
    getSidebarIsOpen, OPEN_SIDEBAR, SET_SAVE_EPISODES,
} from '../reducers/modals';

export const toggleSidebar = () => async (dispatch: any, getState: any) => {
    const sidebarIsOpen = getSidebarIsOpen(getState());
    dispatch({
        type: sidebarIsOpen ? CLOSE_SIDEBAR : OPEN_SIDEBAR,
    });
};

export const collapseSidebar = () => async (dispatch: any, getState: any) => {
    const sidebarIsCollapsed = getSidebarIsCollapsed(getState());
    dispatch({
        type: COLLAPSE_SIDEBAR,
        value: !sidebarIsCollapsed,
    });
};

export const setSaveEpisodes = (value: boolean) => async (dispatch: any, getState: any) => {
    dispatch({
        type: SET_SAVE_EPISODES,
        value,
    });
};
