define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');
    var SAT  = require('sat');
    
    var PixiView = require('common/v3/pixi/view');

    var CapacitorShapeCreator = require('shape-creators/capacitor');

    var DielectricPlateChargeView  = require('views/charge/dielectric-plate');
    var AirPlateChargeView         = require('views/charge/air-plate');
    var EFieldLinesView            = require('views/e-field-lines');

    var Constants = require('constants');
    var Polarity = Constants.Polarity;

    /**
     * 
     */
    var CapacitorView = PixiView.extend({

        initialize: function(options) {
            options = _.extend({
                outlineColor: '#888',
                outlineWidth: 1,
                outlineAlpha: 1
            }, options);

            this.mvt = options.mvt;
            this.maxEffectiveEField = options.maxEffectiveEField;

            this.outlineColor = options.outlineColor;
            this.outlineWidth = options.outlineWidth;
            this.outlineAlpha = options.outlineAlpha;

            // Initialize graphics
            this.initGraphics();
            this.updateMVT(this.mvt);

            // Listen for model events
            this.listenTo(this.model, 'change:plateSeparation', this.update);
        },

        initGraphics: function() {
            this.shapeCreator = new CapacitorShapeCreator(this.model, this.mvt);

            this.bottomLayer = new PIXI.Container();
            this.middleLayer = new PIXI.Container();
            this.topLayer    = new PIXI.Container();

            this.displayObject.addChild(this.bottomLayer);
            this.displayObject.addChild(this.middleLayer);
            this.displayObject.addChild(this.topLayer);

            this.initPlates();
            this.initPlateChargeViews();
            this.initEFieldLines();
        },

        initPlates: function() {
            this.topPlate = new PIXI.Graphics();
            this.bottomPlate = new PIXI.Graphics();

            this.topLayer.addChild(this.topPlate);
            this.bottomLayer.addChild(this.bottomPlate);
        },

        drawPlates: function() {
            this.bottomPlate.clear();
            this.shapeCreator.drawBottomPlate(this.bottomPlate, '#f2f2f2', 1);
            this.shapeCreator.outlineBottomPlate(this.bottomPlate, 1, this.outlineColor, 1);

            this.topPlate.clear();
            this.shapeCreator.drawTopPlate(this.topPlate, '#f2f2f2', 1);
            this.shapeCreator.outlineTopPlate(this.topPlate, 1, this.outlineColor, 1);

            this.topPlatePolygon    = this.shapeCreator.createTopPlateSilhouette();
            this.bottomPlatePolygon = this.shapeCreator.createBottomPlateSilhouette();

            this.spaceBetweenPlatesPolygon      = this.shapeCreator.createSpaceBetweenPlatesSilhouetteOccluded();
            this.dielectricBetweenPlatesPolygon = this.shapeCreator.createDielectricBetweenPlatesSilhouetteOccluded();
        },

        initPlateChargeViews: function() {
            var topChargesOptions = {
                model: this.model,
                mvt: this.mvt,
                transparency: 1,
                maxPlateCharge: this.maxPlateCharge,
                polarity: Polarity.POSITIVE
            };

            var topAirCharges = new AirPlateChargeView(topChargesOptions);
            var topDielectricCharges = new DielectricPlateChargeView(topChargesOptions);

            this.topPlateCharges = new PIXI.Container();
            this.topPlateCharges.addChild(topAirCharges.displayObject);
            this.topPlateCharges.addChild(topDielectricCharges.displayObject);
            this.topLayer.addChild(this.topPlateCharges);

            var bottomChargesOptions = {
                model: this.model,
                mvt: this.mvt,
                transparency: 1,
                maxPlateCharge: this.maxPlateCharge,
                polarity: Polarity.NEGATIVE
            };

            var bottomAirCharges = new AirPlateChargeView(bottomChargesOptions);
            var bottomDielectricCharges = new DielectricPlateChargeView(
                _.extend({}, bottomChargesOptions, { transparency: 0.25 })
            );

            this.bottomPlateCharges = new PIXI.Container();
            this.bottomPlateCharges.addChild(bottomAirCharges.displayObject);
            this.bottomPlateCharges.addChild(bottomDielectricCharges.displayObject);
            this.bottomLayer.addChild(this.bottomPlateCharges);
        },

        initEFieldLines: function() {
            this.eFieldLinesView = new EFieldLinesView({
                model: this.model,
                mvt: this.mvt,
                maxEffectiveEField: this.maxEffectiveEField
            });
            this.eFieldLinesView.hide();

            this.middleLayer.addChild(this.eFieldLinesView.displayObject);
        },

        updateMVT: function(mvt) {
            this.mvt = mvt;

            this.update();
        },

        update: function() {
            this.drawPlates();
        },

        /**
         * Returns whether or not the given polygon or point intersects this view.
         */
        intersectsPolygon: function(polygon) {
            return SAT.testPolygonPolygon(polygon, this.topPlatePolygon) ||
                SAT.testPolygonPolygon(polygon, this.bottomPlatePolygon);
        },

        intersectsTopPlate: function(polygon) {
            return SAT.testPolygonPolygon(polygon, this.topPlatePolygon);
        },

        intersectsBottomPlate: function(polygon) {
            return SAT.testPolygonPolygon(polygon, this.bottomPlatePolygon);
        },

        pointIntersects: function(point) {
            return this.pointIntersectsSpaceBetweenPlates(point);
        },

        pointIntersectsSpaceBetweenPlates: function(point) {
            // The Separating Axis Theorem that SAT implements doesn't support concave polygons,
            //   and the space between plates is a concave polygon, but we can get around it by
            //   just checking to make sure if it hits that it doesn't also hit the top plate.
            return SAT.pointInPolygon(point, this.spaceBetweenPlatesPolygon) && !SAT.pointInPolygon(point, this.topPlatePolygon);
        },

        pointIntersectsDielectricBetweenPlates: function(point) {
            // The Separating Axis Theorem that SAT implements doesn't support concave polygons,
            //   and the space between plates is a concave polygon, but we can get around it by
            //   just checking to make sure if it hits that it doesn't also hit the top plate.
            return SAT.pointInPolygon(point, this.dielectricBetweenPlatesPolygon) && !SAT.pointInPolygon(point, this.topPlatePolygon);
        },

        showPlateCharges: function() {
            this.topPlateCharges.visible = true;
            this.bottomPlateCharges.visible = true;
        },

        hidePlateCharges: function() {
            this.topPlateCharges.visible = false;
            this.bottomPlateCharges.visible = false;
        },

        showEFieldLines: function() {
            this.eFieldLinesView.show();
        },

        hideEFieldLines: function() {
            this.eFieldLinesView.hide();
        },

        /**
         * Returns the y-value that should be used for sorting.
         */
        getYSortValue: function() {
            return this.mvt.modelToViewY(this.model.getY());
        }

    });

    return CapacitorView;
});