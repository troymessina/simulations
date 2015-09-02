define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');
               require('common/pixi/dash-to');

    var Colors = require('common/colors/colors');

    var BendingLightSceneView = require('views/scene');
    var LaserView             = require('views/laser');
    var MediumView            = require('views/medium');
    var ProtractorView        = require('views/protractor');
    var IntensityMeterView    = require('views/intensity-meter');

    var Assets = require('assets');

    // Constants
    var Constants = require('constants');

    /**
     *
     */
    var IntroSceneView = BendingLightSceneView.extend({

        initialize: function(options) {
            BendingLightSceneView.prototype.initialize.apply(this, arguments);
        },

        initGraphics: function() {
            this.mediumLayer = new PIXI.DisplayObjectContainer();
            this.stage.addChild(this.mediumLayer);

            BendingLightSceneView.prototype.initGraphics.apply(this, arguments);

            this.initMediumViews();
            this.initNormalView();
            this.initProtractorView();
            this.initIntensityMeterView();
        },

        initLaserView: function() {
            this.laserView = new LaserView({
                model: this.simulation.laser,
                mvt: this.mvt,
                rotateOnly: true,
                clampAngleFunction: function(angle) {
                    while (angle < 0) 
                        angle += Math.PI * 2;
                    return Math.max(Math.PI / 2, Math.min(angle, Math.PI));
                }
            });

            this.topLayer.addChild(this.laserView.displayObject);
        },

        initMediumViews: function() {
            this.topMediumView    = new MediumView({ model: this.simulation.topMedium,    mvt: this.mvt });
            this.bottomMediumView = new MediumView({ model: this.simulation.bottomMedium, mvt: this.mvt });

            this.mediumLayer.addChild(this.topMediumView.displayObject);
            this.mediumLayer.addChild(this.bottomMediumView.displayObject);
        },

        initNormalView: function() {
            this.normalLine = new PIXI.Graphics();

            this.normalLine.lineStyle(1, 0x000000, 1);
            this.normalLine.moveTo(this.width / 2, this.height * 0.25);
            this.normalLine.dashTo(this.width / 2, this.height * 0.75, [ 10, 10 ]);

            this.stage.addChild(this.normalLine);
        },

        initProtractorView: function() {
            this.protractorView = new ProtractorView({
                mvt: this.mvt
            });
            this.protractorView.displayObject.x = this.width / 2;
            this.protractorView.displayObject.y = this.height / 2;
            this.protractorView.hide();

            this.middleLayer.addChild(this.protractorView.displayObject);
        },

        initIntensityMeterView: function() {
            this.intensityMeterView = new IntensityMeterView({
                model: this.simulation.intensityMeter,
                mvt: this.mvt
            });
            this.intensityMeterView.hide();

            this.bottomLayer.addChild(this.intensityMeterView.displayObject);
        },

        showNormal: function() {
            this.normalLine.visible = true;
        },

        hideNormal: function() {
            this.normalLine.visible = false;
        },

        showProtractor: function() {
            this.protractorView.show();
        },

        hideProtractor: function() {
            this.protractorView.hide();
        }

    });

    return IntroSceneView;
});
