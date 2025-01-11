import dotProps from 'dot-prop-immutable';

export const OPEN_SIDEBAR = 'open_sidebar';
export const CLOSE_SIDEBAR = 'close_sidebar'
export const COLLAPSE_SIDEBAR = 'collapse_sidebar';
export const SET_SAVE_EPISODES = 'set_save_episodes';


const initialState = {
    sidebarIsOpen: window.screen.width > 540,
    sidebarIsCollapsed: window.screen.width < 1100,
    loginFormIsOpen: false,
    registrationFormIsOpen: false,
    saveEpisodes: false,
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
        case SET_SAVE_EPISODES: {
            return dotProps.set(state, 'saveEpisodes', action.value);
        }
        default: {
            return state;
        }
    }
};

export const getSidebarIsOpen = (state: any) => state.projectModals.sidebarIsOpen;
export const getSidebarIsCollapsed = (state: any) => state.projectModals.sidebarIsCollapsed;
export const getSaveEpisodes = (state: any) => state.projectModals.saveEpisodes;
