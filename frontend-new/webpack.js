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
                'yet-another-react-lightbox/styles.css': path.resolve(__dirname, 'node_modules/yet-another-react-lightbox/dist/styles.css'),
                'yet-another-react-lightbox/plugins/thumbnails': path.resolve(__dirname, 'node_modules/yet-another-react-lightbox/dist/plugins/thumbnails/index.js'),
                'yet-another-react-lightbox/plugins/video': path.resolve(__dirname, 'node_modules/yet-another-react-lightbox/dist/plugins/video/index.js'),
                'yet-another-react-lightbox/plugins/thumbnails.css': path.resolve(__dirname, 'node_modules/yet-another-react-lightbox/dist/plugins/thumbnails/thumbnails.css'),
                // 'react/jsx-runtime': require.resolve('react/jsx-runtime.js'),
                // 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime.js'),
            },
        },
    },
});
