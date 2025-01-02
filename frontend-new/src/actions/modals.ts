import {
    CLOSE_SIDEBAR,
    getSidebarState, OPEN_LOGIN_FORM, OPEN_SIDEBAR,
} from '../reducers/modals';

export const toggleSidebar = () => async (dispatch: any, getState: any, components: any) => {
    const sidebarIsOpen = getSidebarState(getState());
    dispatch({
        type: sidebarIsOpen ? CLOSE_SIDEBAR : OPEN_SIDEBAR,
    });
};

export const openLoginForm = () => async (dispatch: any, getState: any, components: any) => {
    dispatch({
        type: OPEN_LOGIN_FORM,
    });
};
