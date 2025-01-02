import dotProps from 'dot-prop-immutable';

export const OPEN_SIDEBAR = 'open_sidebar';
export const CLOSE_SIDEBAR = 'close_sidebar'
export const OPEN_LOGIN_FORM = 'open_login_form';


const initialState = {
    sidebarIsOpen: true,
    loginFormIsOpen: false,
};

export default (state = initialState, action: any) => {
    switch (action.type) {
        case OPEN_SIDEBAR: {
            return dotProps.set(state, 'sidebarIsOpen', true);
        }
        case CLOSE_SIDEBAR: {
            return dotProps.set(state, 'sidebarIsOpen', false);
        }
        case OPEN_LOGIN_FORM: {
            return dotProps.set(state, 'loginFormIsOpen', true);
        }
        default: {
            return state;
        }
    }
};

export const getSidebarState = (state: any) => state.modals.sidebarIsOpen;
