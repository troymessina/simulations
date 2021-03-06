define(function(require) {

    'use strict';

    var PIXI = require('pixi');

    var PixiView = require('common/v3/pixi/view');
    var Colors   = require('common/colors/colors');

    var AtomicNucleus = require('models/atomic-nucleus');
    var NucleusType   = require('models/nucleus-type');

    var Constants = require('constants');

    /**
     * Generates isotope symbols from nucleus models and nucleus types
     */
    var IsotopeSymbolGenerator = {

        /**
         * Generates an isotope symbol from either a nucleus type or a nucleus model
         */
        generate: function(nucleusType, fontSize, anchorX, anchorY) {
            // If they pass in a nucleus model instead of a nucleus type, get the nucleus type
            if (nucleusType instanceof AtomicNucleus)
                nucleusType = NucleusType.identifyNucleus(nucleusType.get('numProtons'), nucleusType.get('numNeutrons'));

            if (nucleusType === null)
                return new PIXI.Sprite(PIXI.Texture.EMPTY);

            var chemicalSymbol = this.getChemicalSymbol(nucleusType);
            var isotopeNumber = this.getIsotopeNumber(nucleusType);
            var color = this.getColor(nucleusType);
            
            return this.createSymbol(chemicalSymbol, isotopeNumber, color, fontSize, anchorX, anchorY);
        },

        generateWithElementColor: function(nucleusType, fontSize, anchorX, anchorY) {
            // If they pass in a nucleus model instead of a nucleus type, get the nucleus type
            if (nucleusType instanceof AtomicNucleus)
                nucleusType = NucleusType.identifyNucleus(nucleusType.get('numProtons'), nucleusType.get('numNeutrons'));

            var chemicalSymbol = this.getChemicalSymbol(nucleusType);
            var isotopeNumber = this.getIsotopeNumber(nucleusType);
            var color = this.getElementColor(nucleusType);
            
            return this.createSymbol(chemicalSymbol, isotopeNumber, color, fontSize, anchorX, anchorY);
        },

        createSymbol: function(chemicalSymbol, isotopeNumber, color, fontSize, anchorX, anchorY) {
            var numberFontSize = (fontSize > 4) ? Math.floor(fontSize * 0.75) : 2;
            var resolution = PixiView.prototype.getResolution();
            var fontStart = 'bold ';
            var fontEnd = 'px Helvetica Neue';
            var shadowColor = (Colors.hexToValue(color) > Colors.hexToValue('#777') || color == Constants.URANIUM_235_LABEL_COLOR) ? '#000' : '#fff';
            var shadowDistance = 1;

            var symbol = new PIXI.Text(chemicalSymbol, {
                font: fontStart + fontSize + fontEnd,
                fill: color,
                dropShadow: true,
                dropShadowDistance: shadowDistance,
                dropShadowColor: shadowColor
            });
            symbol.resolution = resolution;
            symbol.anchor.x = (anchorX !== undefined) ? anchorX : 0.5;
            symbol.anchor.y = (anchorY !== undefined) ? anchorY : 0.5;

            var number = new PIXI.Text(isotopeNumber, {
                font: fontStart + numberFontSize + fontEnd,
                fill: color,
                dropShadow: true,
                dropShadowDistance: shadowDistance,
                dropShadowColor: shadowColor
            });
            number.resolution = resolution;
            number.anchor.x = 1.1;
            number.anchor.y = 0.8;
            number.x = -symbol.width * symbol.anchor.x;

            if (anchorX === undefined && isotopeNumber.toString().length)
                symbol.x = number.width / 2 + fontSize * 0.1;
            if (anchorY === undefined && isotopeNumber.toString().length)
                symbol.y += fontSize * 0.1;

            symbol.addChild(number);

            var container = new PIXI.Container();
            container.addChild(symbol);

            return container;
        },

        getChemicalSymbol: function(nucleusType) {
            switch (nucleusType) {
                case NucleusType.HYDROGEN_3:              return 'H';
                case NucleusType.HELIUM_3:                return 'He';
                case NucleusType.CARBON_14:               return 'C';
                case NucleusType.NITROGEN_14:             return 'N';
                case NucleusType.LIGHT_CUSTOM:            return '?';
                case NucleusType.LIGHT_CUSTOM_POST_DECAY: return '?';
                case NucleusType.LEAD_206:                return 'Pb';
                case NucleusType.LEAD_207:                return 'Pb';
                case NucleusType.POLONIUM_211:            return 'Po';
                case NucleusType.URANIUM_235:             return 'U';
                case NucleusType.URANIUM_236:             return 'U';
                case NucleusType.URANIUM_238:             return 'U';
                case NucleusType.URANIUM_239:             return 'U';
                case NucleusType.HEAVY_CUSTOM:            return '?';
                case NucleusType.HEAVY_CUSTOM_POST_DECAY: return '?';
            }
        },

        getIsotopeNumber: function(nucleusType) {
            switch (nucleusType) {
                case NucleusType.HYDROGEN_3:              return '3';
                case NucleusType.HELIUM_3:                return '3';
                case NucleusType.CARBON_14:               return '14';
                case NucleusType.NITROGEN_14:             return '14';
                case NucleusType.LIGHT_CUSTOM:            return '';
                case NucleusType.LIGHT_CUSTOM_POST_DECAY: return '';
                case NucleusType.LEAD_206:                return '206';
                case NucleusType.LEAD_207:                return '207';
                case NucleusType.POLONIUM_211:            return '211';
                case NucleusType.URANIUM_235:             return '235';
                case NucleusType.URANIUM_236:             return '236';
                case NucleusType.URANIUM_238:             return '238';
                case NucleusType.URANIUM_239:             return '239';
                case NucleusType.HEAVY_CUSTOM:            return '';
                case NucleusType.HEAVY_CUSTOM_POST_DECAY: return '';
            }
        },

        getColor: function(nucleusType) {
            switch (nucleusType) {
                case NucleusType.HYDROGEN_3:              return Constants.HYDROGEN_3_LABEL_COLOR;
                case NucleusType.HELIUM_3:                return Constants.HELIUM_3_LABEL_COLOR
                case NucleusType.CARBON_14:               return Constants.CARBON_14_LABEL_COLOR;
                case NucleusType.NITROGEN_14:             return Constants.NITROGEN_14_LABEL_COLOR
                case NucleusType.LIGHT_CUSTOM:            return Constants.CUSTOM_NUCLEUS_LABEL_COLOR;
                case NucleusType.LIGHT_CUSTOM_POST_DECAY: return Constants.CUSTOM_NUCLEUS_POST_DECAY_LABEL_COLOR;
                case NucleusType.LEAD_206:                return Constants.LEAD_LABEL_COLOR;
                case NucleusType.LEAD_207:                return Constants.LEAD_LABEL_COLOR;
                case NucleusType.POLONIUM_211:            return Constants.POLONIUM_LABEL_COLOR;
                case NucleusType.URANIUM_235:             return Constants.URANIUM_235_LABEL_COLOR;
                case NucleusType.URANIUM_236:             return Constants.URANIUM_236_LABEL_COLOR;
                case NucleusType.URANIUM_238:             return Constants.URANIUM_238_LABEL_COLOR;
                case NucleusType.URANIUM_239:             return Constants.URANIUM_239_LABEL_COLOR;
                case NucleusType.HEAVY_CUSTOM:            return Constants.CUSTOM_NUCLEUS_LABEL_COLOR;
                case NucleusType.HEAVY_CUSTOM_POST_DECAY: return Constants.CUSTOM_NUCLEUS_POST_DECAY_LABEL_COLOR;
            }
        },

        getElementColor: function(nucleusType) {
            switch (nucleusType) {
                case NucleusType.CARBON_14:               return Constants.CARBON_COLOR;
                case NucleusType.NITROGEN_14:             return Constants.NITROGEN_COLOR
                case NucleusType.LIGHT_CUSTOM:            return Constants.CUSTOM_NUCLEUS_PRE_DECAY_COLOR;
                case NucleusType.LIGHT_CUSTOM_POST_DECAY: return Constants.CUSTOM_NUCLEUS_POST_DECAY_COLOR;
                case NucleusType.LEAD_206:
                case NucleusType.LEAD_207:                return Constants.LEAD_COLOR;
                case NucleusType.POLONIUM_211:            return Constants.POLONIUM_COLOR;
                case NucleusType.URANIUM_235:
                case NucleusType.URANIUM_236:
                case NucleusType.URANIUM_238:
                case NucleusType.URANIUM_239:             return Constants.URANIUM_COLOR;
                case NucleusType.HEAVY_CUSTOM:            return Constants.CUSTOM_NUCLEUS_PRE_DECAY_COLOR;
                case NucleusType.HEAVY_CUSTOM_POST_DECAY: return Constants.CUSTOM_NUCLEUS_POST_DECAY_COLOR;
            }
        },

    };

    return IsotopeSymbolGenerator;
});