require('@steroidsjs/webpack').config({
    inlineSvg: true,
    port: 9991,
    webpack: {
        module: {
            rules: {
                mjs: {
                    test: /\.m?js/,
                    resolve: {
                        fullySpecified: false,
                    },
                },
            },
        },
        // resolve: {
        //     alias: {
        //         'react/jsx-runtime': require.resolve('react/jsx-runtime.js'),
        //         'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime.js'),
        //     },
        // },
    },
});
