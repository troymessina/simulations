define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');

    var PixiView  = require('common/v3/pixi/view');
    var Colors    = require('common/colors/colors');
    var Rectangle = require('common/math/rectangle');

    var Charge = require('models/charge');
    var ReservoirObjectView = require('views/reservoir-object');

    var Constants = require('constants');

    /**
     * A visual representation of some kind of object supply.  The
     *   user creates new objects with this view.  Dragging from 
     *   the view creates a new object and places it in the scene,
     *   while dragging an existing object back onto this view
     *   destroys it.
     */
    var ObjectReservoir = PixiView.extend({

        numDecorationAttempts: 180,

        events: {
            'touchstart      .background': 'dragStart',
            'mousedown       .background': 'dragStart',
            'touchmove       .background': 'drag',
            'mousemove       .background': 'drag',
            'touchend        .background': 'dragEnd',
            'mouseup         .background': 'dragEnd',
            'touchendoutside .background': 'dragEnd',
            'mouseupoutside  .background': 'dragEnd'
        },

        initialize: function(options) {
            options = _.extend({
                width: 179,
                height: 100,
                thickness: 4,
                depth: 16,

                labelText: 'E-Field Sensors',
                labelFont: 'bold 16px Helvetica Neue',
                labelColor: '#444',

                outlineColor: '#f0f0f0',
                outlineAlpha: 0.8,
                fillColor: '#fafafa', // Only used if showDepth is false
                fillAlpha: 0.6,       // Only used if showDepth is false
                insideColor: '#f2f2f2',
                insideAlpha: 0.8,
                bottomColor: '#f0f0f0',
                bottomAlpha: 0.6,

                destroyHighlightOutlineColor: '#21366b',
                destroyHighlightOutlineAlpha: 1,
                destroyHighlightFillColor: '#21366b',
                destroyHighlightFillAlpha: 0.3,

                showDepth: false
            }, options);

            this.mvt = options.mvt;
            this.simulation = options.simulation;
            this.dummyLayer = options.dummyLayer;

            this.width = options.width;
            this.height = options.height;
            this.thickness = options.thickness;
            this.depth = options.depth;

            this.labelText = options.labelText;
            this.labelFont = options.labelFont;
            this.labelColor = options.labelColor;

            this.outlineColor = Colors.parseHex(options.outlineColor);
            this.outlineAlpha = options.outlineAlpha;
            this.fillColor = Colors.parseHex(options.fillColor);
            this.fillAlpha = options.fillAlpha;
            this.insideColor  = Colors.parseHex(options.insideColor);
            this.insideShadowColor = Colors.parseHex(Colors.darkenHex(options.insideColor, 0.12));
            this.insideAlpha  = options.insideAlpha;
            this.bottomColor  = Colors.parseHex(options.bottomColor);
            this.bottomAlpha  = options.bottomAlpha;

            this.destroyHighlightOutlineColor = Colors.parseHex(options.destroyHighlightOutlineColor);
            this.destroyHighlightOutlineAlpha = options.destroyHighlightOutlineAlpha;
            this.destroyHighlightFillColor = Colors.parseHex(options.destroyHighlightFillColor);
            this.destroyHighlightFillAlpha = options.destroyHighlightFillAlpha;

            this.showDepth = options.showDepth;

            // Cached objects
            this._bounds = new Rectangle();

            this.initGraphics();
        },

        initGraphics: function() {
            this.initBackground();
            this.initDecorativeDummyObjects();
            this.initLabel();
            this.initDestroyHighlight();

            this.updateMVT(this.mvt);
        },

        initBackground: function() {
            var bg = new PIXI.Graphics();
            var w = this.width;
            var h = this.height;
            var m = this.thickness;
            var d = this.depth;

            // Draw outline
            bg.beginFill(this.outlineColor, this.outlineAlpha);
            bg.drawRect(0, 0, w, m);             // Top piece
            bg.drawRect(0, h - m, w, m);         // Bottom piece
            bg.drawRect(0, m, m, h - m - m);     // Left piece
            bg.drawRect(w - m, m, m, h - m - m); // Right piece
            bg.endFill();

            if (this.showDepth) {
                // Draw inside walls of the box
                // Top side (will be a little darker to simulate shadow)
                bg.beginFill(this.insideShadowColor, this.insideAlpha);
                bg.moveTo(m, m);
                bg.lineTo(w - m, m);
                bg.lineTo(w - m - d, m + d);
                bg.lineTo(m + d, m + d);
                bg.endFill();

                // Side sides
                bg.beginFill(this.insideColor, this.insideAlpha);
                bg.moveTo(w - m, m);
                bg.lineTo(w - m, h - m);
                bg.lineTo(w - m - d, h - m - d);
                bg.lineTo(w - m - d, m + d);
                bg.endFill();
                bg.beginFill(this.insideColor, this.insideAlpha);
                bg.moveTo(m, m);
                bg.lineTo(m + d, m + d);
                bg.lineTo(m + d, h - m - d);
                bg.lineTo(m, h - m);
                bg.endFill();

                // Bottom side (will be a bit less transparent to simulate light hiting it)
                bg.beginFill(this.insideColor, this.insideAlpha * 1.3);
                bg.moveTo(m, h - m);
                bg.lineTo(m + d, h - m - d);
                bg.lineTo(w - m - d, h - m - d);
                bg.lineTo(w - m, h - m);
                bg.endFill();

                // Draw bottom of the box
                bg.beginFill(this.bottomColor, this.bottomAlpha);
                bg.drawRect(m + d, m + d, w - m * 2 - d * 2, h - m * 2 - d * 2);
                bg.endFill();
            }
            else {
                // Fill in the center
                bg.beginFill(this.fillColor, this.fillAlpha);
                bg.drawRect(m, m, w - m * 2, h - m * 2);
                bg.endFill();
            }

            bg.buttonMode = true;

            // Add it to the display object
            this.displayObject.addChild(bg);
            this.background = bg;
        },

        initDecorativeDummyObjects: function() {
            this.decorativeDummyObjectsMask = new PIXI.Graphics();
            this.displayObject.addChild(this.decorativeDummyObjectsMask);

            this.decorativeDummyObjects = new PIXI.Container();
            this.decorativeDummyObjects.mask = this.decorativeDummyObjectsMask;
            this.displayObject.addChild(this.decorativeDummyObjects);
        },

        initLabel: function() {
            var textSettings = {
                font: this.labelFont,
                fill: this.labelColor
            };

            var label = new PIXI.Text(this.labelText, textSettings);
            label.resolution = this.getResolution();
            label.anchor.x = 0.5;
            label.anchor.y = -0.11;
            label.x = this.width / 2;
            label.y = this.thickness;

            this.displayObject.addChild(label);
        },

        initDestroyHighlight: function() {
            var graphics = new PIXI.Graphics();
            var w = this.width;
            var h = this.height;
            var m = this.thickness;
            var d = this.depth;

            // Draw outline
            graphics.beginFill(this.destroyHighlightOutlineColor, this.destroyHighlightOutlineAlpha);
            graphics.drawRect(0, 0, w, m);             // Top piece
            graphics.drawRect(0, h - m, w, m);         // Bottom piece
            graphics.drawRect(0, m, m, h - m - m);     // Left piece
            graphics.drawRect(w - m, m, m, h - m - m); // Right piece
            graphics.endFill();

            // Fill in center
            graphics.beginFill(this.destroyHighlightFillColor, this.destroyHighlightFillAlpha);
            graphics.drawRect(m, m, w - m * 2, h - m * 2);
            graphics.endFill();

            // Hide it by default
            graphics.visible = false;

            // Add it to the display object
            this.displayObject.addChild(graphics);
            this.destroyHighlight = graphics;
        },

        drawDecorativeDummyObjects: function() {
            var m = this.thickness;
            var width = this.width - m * 2;
            var height = this.height - m * 2;
            var dummy;
            var dummies = this.decorativeDummyObjects;
            var x, y;

            var isAboveCurve = function(x, y) {
                var fx = (-0.004 * Math.pow(x - width / 2, 2)) + (height * 0.5);
                return y > fx;
            };

            for (var n = 0; n < this.numDecorationAttempts; n++) {
                x = Math.random() * width;
                y = Math.random() * height;
                if (isAboveCurve(x, y)) {
                    dummy = this.createDummyObject();
                    dummy.setPosition(x + m, y + m);
                    dummies.addChild(dummy.displayObject);
                }
            }

            var mask = this.decorativeDummyObjectsMask;
            mask.clear();
            mask.beginFill(0x000000, 1);
            mask.drawRect(m, m, width, height);
            mask.endFill();
        },

        /**
         * Creates a new object (of whatever this reservoir contains)
         *   and returns it so it can be added to the scene as a
         *   dummy object.  Note the dummy object will not be added
         *   to the simulation until it gets turned into a real
         *   object after the user drops it.
         */
        createDummyObject: function() {
            var model = new Charge();
            var view = new ReservoirObjectView({
                model: model,
                mvt: this.mvt,
                interactive: false
            });
            return view;
        },

        destroyObject: function(object) {
            object.destroy();
        },

        /**
         * Creates the actual object based off of the position of the
         *   dummy object and adds it to the simulation/scene.
         */
        createAndAddObject: function(dummyObject) {},

        updateMVT: function(mvt) {
            this.mvt = mvt;

            this.drawDecorativeDummyObjects();
        },

        dragStart: function(event) {
            this.dragging = true;

            this.dummyObject = this.createDummyObject();
            this.dummyLayer.addChild(this.dummyObject.displayObject);
        },

        drag: function(event) {
            if (this.dragging) {
                this.dummyObject.setPosition(
                    event.data.global.x,
                    event.data.global.y
                );
            }
        },

        dragEnd: function(event) {
            this.dragging = false;

            if (this.dummyObject) {
                var x = this.dummyObject.displayObject.x;
                var y = this.dummyObject.displayObject.y;

                if (!this.contains(x, y)) {
                    // Create a real object and add it to the sim
                    this.createAndAddObject(this.dummyObject.model);
                }

                this.dummyObject.removeFrom(this.dummyLayer);
                this.dummyObject.model.destroy();
                this.dummyObject = null;
            }
        },

        getBounds: function() {
            return this._bounds.set(
                this.displayObject.x,
                this.displayObject.y,
                this.width,
                this.height
            );
        },

        /**
         * Returns whether or not a circle on the screen at point (x, y)
         *   with the given radius would overlap with the reservoir.
         */
        overlapsCircle: function(x, y, radius) {
            return this.getBounds().overlapsCircle(x, y, radius);
        },

        /**
         * Returns whether or not a point on the screen lies inside the
         *   reservoir's bounds.
         */
        contains: function(x, y) {
            return this.getBounds().contains(x, y);
        },

        showDestroyHighlight: function() {
            this.destroyHighlight.visible = true;
        },

        hideDestroyHighlight: function() {
            this.destroyHighlight.visible = false;
        }

    });


    return ObjectReservoir;
});