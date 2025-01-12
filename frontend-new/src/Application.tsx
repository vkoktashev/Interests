import useApplication from '@steroidsjs/core/hooks/useApplication';
import LocaleComponent from '@steroidsjs/core/components/LocaleComponent';
import customIcons from 'icons/index';

import 'style/index.scss';
import JwtHttpComponent from '@steroidsjs/core/components/JwtHttpComponent';

export const config = {
    reducers: require('reducers').default,
    routes: () => require('routes').default,
    layoutView: () => require('shared/Layout').default,
    screen: {},
    components: {
        locale: LocaleComponent,
        http: {
            http: JwtHttpComponent,
            className: JwtHttpComponent,
            apiUrl: process.env.APP_BACKEND_URL,
            clientStorageName: 'local',
            refreshTokenRequest: {
                url: '/users/auth/refresh-token/',
                method: 'post',
            },
        },
    },
    onInit: ({ui}) => {
        ui.addViews(require('./ui/bootstrap').default);
        ui.addFields(require('@steroidsjs/core/ui/form').default);
        ui.addFormatters(require('@steroidsjs/core/ui/format').default);
        ui.addIcons(require('@steroidsjs/bootstrap/icons/index').default(customIcons));
    },
    theme: {},
};

export default function Application() {
    const {renderApplication} = useApplication(config);

    return renderApplication();
}
