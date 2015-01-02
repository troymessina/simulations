define(function(require) {

    'use strict';

    var _ = require('underscore');
    var PIXI = require('pixi');

    var EnergyConverterView = require('views/energy-converter');
    var EnergyChunkView     = require('views/energy-chunk');

    var Assets = require('assets');

    var Constants = require('constants');
    var ElectricalGenerator = Constants.ElectricalGenerator;

    var ElectricalGeneratorView = EnergyConverterView.extend({

        /**
         *
         */
        initialize: function(options) {
            options = _.extend({
                
            }, options);

            EnergyConverterView.prototype.initialize.apply(this, [options]);

            this.listenTo(this.model, 'change:wheelRotationalAngle', this.updateWheelRotation);

            this.hiddenEnergyChunkViews = [];
            
            this.listenTo(this.model.hiddenEnergyChunks, 'add',    this.hiddenEnergyChunkAdded);
            this.listenTo(this.model.hiddenEnergyChunks, 'remove', this.hiddenEnergyChunkRemoved);
            this.listenTo(this.model.hiddenEnergyChunks, 'reset',  this.hiddenEnergyChunksReset);
        },

        initGraphics: function() {
            EnergyConverterView.prototype.initGraphics.apply(this);

            this.backLayer = new PIXI.DisplayObjectContainer();
            this.frontLayer = new PIXI.DisplayObjectContainer();
            this.hiddenEnergyChunkLayer = new PIXI.DisplayObjectContainer();

            var curvedWire = this.createSpriteWithOffset(Assets.Images.WIRE_BLACK_LEFT,         ElectricalGenerator.WIRE_OFFSET);
            var housing    = this.createSpriteWithOffset(Assets.Images.GENERATOR);
            var connector  = this.createSpriteWithOffset(Assets.Images.CONNECTOR,               ElectricalGenerator.CONNECTOR_OFFSET);
            var spokes     = this.createSpriteWithOffset(Assets.Images.GENERATOR_WHEEL_SPOKES,  ElectricalGenerator.WHEEL_CENTER_OFFSET, 0.5);
            var paddles    = this.createSpriteWithOffset(Assets.Images.GENERATOR_WHEEL_PADDLES, ElectricalGenerator.WHEEL_CENTER_OFFSET, 0.5);
            var hub        = this.createSpriteWithOffset(Assets.Images.GENERATOR_WHEEL_HUB_2,   ElectricalGenerator.WHEEL_CENTER_OFFSET, 0.5);

            this.backLayer.addChild(curvedWire);
            this.frontLayer.addChild(housing);
            this.frontLayer.addChild(connector);
            this.frontLayer.addChild(spokes);
            this.frontLayer.addChild(paddles);
            this.frontLayer.addChild(hub);

            this.spokes = spokes;
            this.paddles = paddles;
            
            this.drawDebugOrigin(this.frontLayer);
        },

        createSpriteWithOffset: function(image, offset, anchorX, anchorY) {
            var sprite = Assets.createSprite(image);

            if (anchorX === undefined)
                anchorX = 0;
            if (anchorY === undefined)
                anchorY = anchorX;

            sprite.anchor.x = anchorX;
            sprite.anchor.y = anchorY;

            var centerXOffset = (anchorX - 0.5) * sprite.width;
            var centerYOffset = (anchorY - 0.5) * sprite.height;

            if (offset) {
                sprite.x = centerXOffset + this.mvt.modelToViewDeltaX(offset.x);
                sprite.y = centerYOffset + this.mvt.modelToViewDeltaY(offset.y);    
            }
            else {
                sprite.x = centerXOffset;
                sprite.y = centerYOffset;
            }
            return sprite;
        },

        updatePosition: function(model, position) {
            var viewPoint = this.mvt.modelToView(position);
            this.backLayer.x = this.frontLayer.x = viewPoint.x;
            this.backLayer.y = this.frontLayer.y = viewPoint.y;
        },

        updateWheelRotation: function(model, rotation) {
            this.spokes.rotation  = -rotation;
            this.paddles.rotation = -rotation;
        },

        hiddenEnergyChunkAdded: function(chunk) {
            var chunkView = new EnergyChunkView({
                model: chunk,
                mvt: this.mvt
            });
            this.hiddenEnergyChunkViews.push(chunkView);
            this.hiddenEnergyChunkLayer.addChild(chunkView.displayObject);
        },

        hiddenEnergyChunkRemoved: function(chunk) {
            for (var i = this.hiddenEnergyChunkViews.length - 1; i >= 0; i--) {
                if (this.hiddenEnergyChunkViews[i].model === chunk) {
                    this.hiddenEnergyChunkViews[i].remove(this.hiddenEnergyChunkLayer);
                    this.hiddenEnergyChunkViews.splice(i, 1);
                    break;
                }
            }
        },

        hiddenEnergyChunksReset: function() {
            for (var i = this.energyChunkViews.length - 1; i >= 0; i--) {
                this.energyChunkViews[i].remove(this.energyChunkLayer);
                this.energyChunkViews.splice(i, 1);
            }
        },

        showEnergyChunks: function() {
            EnergyConverterView.prototype.showEnergyChunks.apply(this);
            this.hiddenEnergyChunkLayer.visible = true;
        },

        hideEnergyChunks: function() {
            EnergyConverterView.prototype.hideEnergyChunks.apply(this);
            this.hiddenEnergyChunkLayer.visible = false;
        },

    });

    return ElectricalGeneratorView;
});