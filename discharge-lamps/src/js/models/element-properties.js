define(function (require) {

    'use strict';

    var _ = require('underscore');

    var ElementProperties = require('common/quantum/models/element-properties');

    var LevelSpecificEnergyEmissionStrategy = require('./level-specific-energy-emission-strategy');
    var EqualLikelihoodAbsorptionStrategy   = require('./equal-likelihood-absorption-strategy');
    var DischargeLampAtom                   = require('./atom');

    /**
     * A place to store element properties
     */
    var DischargeLampElementProperties = ElementProperties.extend({

        defaults: _.extend({}, ElementProperties.prototype.defaults, {
            energyAbsorptionStrategy: null,
            meanStateLifetime: DischargeLampAtom.DEFAULT_STATE_LIFETIME
        }),
        
        /**
         * 
         */
        initialize: function(attributes, options) {
            options = _.extend({
                transitionEntries: []
            }, options);

            ElementProperties.prototype.initialize.apply(this, [attributes, options]);

            var emissionStrategy = new LevelSpecificEnergyEmissionStrategy(options.transitionEntries);
            emissionStrategy.setStates(this.getStates());

            if (!this.get('energyEmissionStrategy'))
                this.set('energyEmissionStrategy', emissionStrategy);
            if (!this.get('energyAbsorptionStrategy'))
                this.set('energyAbsorptionStrategy', new EqualLikelihoodAbsorptionStrategy());
        },

        getEnergyAbsorptionStrategy: function() {
            return this.get('energyAbsorptionStrategy');
        },

        setEnergyAbsorptionStrategy: function(energyAbsorptionStrategy) {
            this.set('energyAbsorptionStrategy', energyAbsorptionStrategy);
        }

    });


    DischargeLampElementProperties.TransitionEntry = function(sourceStateIndex, targetStateIndex, txStrength) {
        this.sourceStateIndex = sourceStateIndex;
        this.targetStateIndex = targetStateIndex;
        this.txStrength = txStrength;
    };


    return DischargeLampElementProperties;
});
