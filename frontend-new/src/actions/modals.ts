import {
    CLOSE_SIDEBAR, COLLAPSE_SIDEBAR, getSidebarIsCollapsed,
    getSidebarIsOpen, OPEN_LOGIN_FORM, OPEN_REGISTRATION_FORM, OPEN_SIDEBAR,
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

export const openLoginForm = () => async (dispatch: any) => {
    dispatch({
        type: OPEN_LOGIN_FORM,
    });
};

export const openRegistrationForm = () => async (dispatch: any) => {
    dispatch({
        type: OPEN_REGISTRATION_FORM,
    });
};
