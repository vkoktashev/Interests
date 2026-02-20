const path = require('path');

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
        resolve: {
            alias: {
                memoize: path.resolve(__dirname, 'node_modules/memoize/distribution/index.js'),
                // 'react/jsx-runtime': require.resolve('react/jsx-runtime.js'),
                // 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime.js'),
            },
        },
    },
});
