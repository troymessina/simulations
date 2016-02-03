(function () {
    'use strict';

    var config = {
        paths: {
            jquery:           '../../bower_components/jquery/dist/jquery',
            underscore:       '../../bower_components/underscore/underscore',
            backbone:         '../../bower_components/backbone/backbone',
            bootstrap:        '../../bower_components/bootstrap/dist/js/bootstrap.min',
            text:             '../../bower_components/requirejs-text/text',
            pixi:             '../../bower_components/pixi/bin/pixi.dev',
            nouislider:       '../../bower_components/nouislider/distribute/jquery.nouislider.all.min',
            'vector2-node':   '../../node_modules/vector2-node-shimmed/index',
            'object-pool':    '../../node_modules/object-pool-shimmed/index',
            'circular-list':  '../../node_modules/object-pool-shimmed/node_modules/circular-list/index',

            views:      '../js/views',
            models:     '../js/models',
            assets:     '../js/assets',
            constants:  '../js/constants',
            templates:  '../templates',
            styles:     '../styles',
            common:     '../../../common'
        },

        packages: [{
            name: 'css',
            location: '../../bower_components/require-css',
            main: 'css'
        }, {
            name: 'less',
            location: '../../bower_components/require-less',
            main: 'less'
        }],

        less: {
            logLevel: 1,
            async: true,

            globalVars: {
                dependencyDir: '"/bower_components"'
            }
        }
    };

    require.config(config);
})();