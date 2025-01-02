import dotProps from 'dot-prop-immutable';

export const OPEN_SIDEBAR = 'open_sidebar';
export const CLOSE_SIDEBAR = 'close_sidebar'
export const OPEN_LOGIN_FORM = 'open_login_form';
export const OPEN_REGISTRATION_FORM = 'open_registration_form';
export const COLLAPSE_SIDEBAR = 'collapse_sidebar';


const initialState = {
    sidebarIsOpen: true,
    sidebarIsCollapsed: false,
    loginFormIsOpen: false,
    registrationFormIsOpen: false,
};

export default (state = initialState, action: any) => {
    switch (action.type) {
        case OPEN_SIDEBAR: {
            return dotProps.set(state, 'sidebarIsOpen', true);
        }
        case CLOSE_SIDEBAR: {
            return dotProps.set(state, 'sidebarIsOpen', false);
        }
        case COLLAPSE_SIDEBAR: {
            return dotProps.set(state, 'sidebarIsCollapsed', action.value);
        }
        case OPEN_LOGIN_FORM: {
            return dotProps.set(state, 'loginFormIsOpen', true);
        }
        case OPEN_REGISTRATION_FORM: {
            return dotProps.set(state, 'registrationFormIsOpen', true);
        }
        default: {
            return state;
        }
    }
};

export const getSidebarIsOpen = (state: any) => state.modals.sidebarIsOpen;
export const getSidebarIsCollapsed = (state: any) => state.modals.sidebarIsCollapsed;
