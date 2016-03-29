define(function (require, exports, module) {

    'use strict';

    var RutherfordScatteringSimulation = require('rutherford-scattering/models/simulation');
    var RutherfordParticles  = require('rutherford-scattering/collections/rutherford-particles');

    var AtomNode = require('../atom-node');

    /**
     * Constants
     */
    var Constants = require('constants');

    /**
     * Wraps the update function in 
     */
    var RutherfordAtomSimulation = RutherfordScatteringSimulation.extend({
        
        initialize: function(attributes, options) {
            this.boundWidth = Constants.RUTHERFORD_ACTUAL;
            RutherfordScatteringSimulation.prototype.initialize.apply(this, arguments);

            this.on('change:protonCount change:neutronCount', this.atomNode.updateRadius.bind(this.atomNode))
        },

        initComponents: function(){
            RutherfordScatteringSimulation.prototype.initComponents.apply(this, arguments);
            this.atomNode = new AtomNode(null, {simulation: this});
        },

        initAlphaParticles: function() {
            this.alphaParticles = new RutherfordParticles(null, {bounds: this.bounds});
        }

    });

    return RutherfordAtomSimulation;
});
