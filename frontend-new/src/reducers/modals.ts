import dotProps from 'dot-prop-immutable';

export const OPEN_SIDEBAR = 'open_sidebar';
export const CLOSE_SIDEBAR = 'close_sidebar'
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
        default: {
            return state;
        }
    }
};

export const getSidebarIsOpen = (state: any) => state.projectModals.sidebarIsOpen;
export const getSidebarIsCollapsed = (state: any) => state.projectModals.sidebarIsCollapsed;
