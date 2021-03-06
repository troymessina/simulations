(function () {
    'use strict';

    var config = {
        paths: {
            jquery:     '../../bower_components/jquery/dist/jquery',
            underscore: '../../bower_components/lodash/dist/lodash',
            backbone:   '../../bower_components/backbone/backbone',
            bootstrap:  '../../bower_components/bootstrap/dist/js/bootstrap.min',
            text:       '../../bower_components/requirejs-text/text',
            pixi:       '../../bower_components/pixi/bin/pixi',
            nouislider: '../../bower_components/nouislider/distribute/jquery.nouislider.all.min',
            glmatrix:   '../../bower_components/gl-matrix/dist/gl-matrix',
            buzz:       '../../bower_components/buzz/dist/buzz.min',
            fparser:    '../../bower_components/fparser/fparser',

            views:      '../js/views',
            models:     '../js/models',
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
        },

        shim: {
            fparser: {
                exports: 'Formula'
            }
        }
    };

    require.config(config);
})();