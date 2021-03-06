define(function(require) {

    'use strict';

    var PIXI = require('pixi');

    var SpriteCollectionView = require('common/v3/pixi/view/sprite-collection');
    var WavelengthColors     = require('common/colors/wavelength');
    var Colors               = require('common/colors/colors');

    var Constants = require('constants');
    var Assets = require('assets');

    /**
     * A view that renders photon sprites for every photon in the sim
     */
    var PhotonCollectionView = SpriteCollectionView.extend({

        initialize: function(options) {
            // A map of wavelengths to colors for caching
            this.colors = {};

            // Make all the photons brighter by putting a brightness
            //   filter on the whole displayObject
            var colorMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
            var filter = new PIXI.filters.ColorMatrixFilter();
            filter.matrix = colorMatrix;
            filter.brightness(2.3, false);
            this.displayObject.filters = [filter];

            // UV texture
            this.uvTexture = Assets.Texture(Assets.Images.PHOTON_UV);
            
            SpriteCollectionView.prototype.initialize.apply(this, arguments);
        },

        /**
         * Returns texture used for sprites.  Override in child classes.
         */
        getTexture: function() {
            return Assets.Texture(Assets.Images.PHOTON);
        },

        /**
         * Calculates current scale for sprites.  Override in child classes.
         */
        getSpriteScale: function() {
            var targetWidth = this.mvt.modelToViewDeltaX(Constants.PHOTON_DIAMETER);
            var scale = targetWidth / this.texture.width;
            return scale;
        },

        getColorFromWavelength: function(wavelength) {
            var key = '' + wavelength;
            if (this.colors[key] === undefined)
                this.colors[key] = Colors.parseHex(WavelengthColors.nmToHex(wavelength));
            return this.colors[key];
        },

        createSprite: function() {
            var sprite = SpriteCollectionView.prototype.createSprite.apply(this, arguments);
            sprite.blendMode = PIXI.BLEND_MODES.ADD;
            return sprite;
        },

        updateSprite: function(sprite, model) {
            SpriteCollectionView.prototype.updateSprite.apply(this, arguments);
            
            if (model.get('wavelength') < WavelengthColors.MIN_WAVELENGTH) {
                sprite.texture = this.uvTexture;
                sprite.tint = 0xFFFFFF;
            }
            else {
                sprite.texture = this.texture;
                sprite.tint = this.getColorFromWavelength(model.get('wavelength'));
            }
        }

    });

    return PhotonCollectionView;
});