define(function (require, exports, module) {

    'use strict';

    var _ = require('underscore');

    var VanillaCollection = require('common/collections/vanilla');
    var Vector2           = require('common/math/vector2');

    var NuclearPhysicsSimulation   = require('models/simulation');
    var Uranium235CompositeNucleus = require('models/nucleus/uranium-235-composite');
    var Nucleon                    = require('models/nucleon');
    var AlphaParticle              = require('models/alpha-particle');
    var AtomicNucleus              = require('models/atomic-nucleus');

    var NeutronSource = require('nuclear-fission/models/neutron-source');

    /**
     * Constants
     */
    var Constants = require('constants');

    /**
     * Base simulation model for multi-nucleus decay simulations
     */
    var OneNucleusSimulation = NuclearPhysicsSimulation.extend({

        defaults: _.extend({}, NuclearPhysicsSimulation.prototype.defaults, {
            
        }),
        
        initialize: function(attributes, options) {
            NuclearPhysicsSimulation.prototype.initialize.apply(this, [attributes, options]);
        },

        /**
         * Initializes the models used in the simulation
         */
        initComponents: function() {
            // Add a nucleus of Uranium 235 to the model.
            this.primaryNucleus = Uranium235CompositeNucleus.create({
                fissionInterval: OneNucleusSimulation.FISSION_INTERVAL,
                simulation: this
            });

            // Add the neutron source to the side of the model.
            this.neutronSource = new NeutronSource({
                position: new Vector2(-30, 0)
            });

            this.freeNucleons = new VanillaCollection();
            this.freeAlphas = new VanillaCollection();

            this.initialParentAccel = new Vector2();
            this.initialDaughterAccel = new Vector2();

            this.listenTo(this.neutronSource, 'neutron-generated', this.neutronGenerated);
        },

        /**
         * Resets the model components
         */
        reset: function() {
            // Reset the primary nucleus.
            this.primaryNucleus.reset(this.freeNucleons, this.daughterNucleus);

            if (this.daughterNucleus) {
                // Fission has occurred, so the daughter must be reset, meaning
                //   that it essentially goes away.
                this.daughterNucleus.reset();
                this.daughterNucleus.destroy();
                this.daughterNucleus = null;
            }

            // The primary nucleus does not reabsorb all of the neutrons, since
            //   at least one (and possibly several) was generated by the neutron
            //   gun and wasn't a part of the original nucleus.  So, here we
            //   simply get rid of any neutrons that are left over after the
            //   primary nucleus has had a chance to reabsorb them.
            this.destroyFreeNucleons();

            this.trigger('reset');
        },

        destroyFreeNucleons: function() {
            for (var i = this.freeNucleons.length - 1; i >= 0; i--)
                this.freeNucleons.at(i).destroy();
        },

        /**
         * Runs every frame of the simulation loop.
         */
        _update: function(time, deltaTime) {
            // Update the velocity and acceleration of the daughter nuclei (if they exist).
            this.updateNucleiBehavior(time, deltaTime);

            // Move any free particles that exist.
            this.updateFreeNucleons(time, deltaTime);
        },

        updateNucleiBehavior: function(time, deltaTime) {
            if (this.daughterNucleus) {
                // The nuclei have fissioned and are traveling away from each
                //   other. As they do this, the acceleration decreases because
                //   the force they exert on each other becomes smaller. That's
                //   what we are trying to model here.
                var distance = this.daughterNucleus.get('position').distance(this.primaryNucleus.get('position')) / this.primaryNucleus.get('diameter');
                if (distance > 1) {
                    var scaleFactor = 1 / (distance * distance);
                    this.daughterNucleus.setAcceleration(
                        this.initialDaughterAccel.x * scaleFactor,
                        this.initialDaughterAccel.y * scaleFactor
                    );
                    this.primaryNucleus.setAcceleration(
                        this.initialParentAccel.x * scaleFactor,
                        this.initialParentAccel.y * scaleFactor
                    );
                }
            }

            // Updating of the nuclei has to happen after the code above is run, or else the velocity
            //   will get updated with the actual initial acceleration values, which are way too fast.

            // Update the daughter nucleus
            if (this.daughterNucleus)
                this.daughterNucleus.update(time, deltaTime);

            // Update the primary nucleus
            this.primaryNucleus.update(time, deltaTime);
        },

        updateFreeNucleons: function(time, deltaTime) {
            for (var i = 0; i < this.freeNucleons.length; i++) {
                var freeNucleon = this.freeNucleons.at(i);
                freeNucleon.update();

                // Check if any of the free particles have collided with the nucleus
                //   and, if so, transfer the particle into the nucleus.
                var distFromNucleus = freeNucleon.get('position').distance(this.primaryNucleus.get('position'));
                if (distFromNucleus < this.primaryNucleus.get('diameter') / 2) {
                    if (this.primaryNucleus.captureParticle(freeNucleon, time))
                        this.freeNucleons.remove(freeNucleon);
                }
            }
        },

        triggerNucleusChange: function(nucleus, byProducts) {
            this.atomicWeightChanged(nucleus, byProducts);
            this.trigger('nucleus-change', nucleus, byProducts);
        },

        /**
         * Handle a change in atomic weight of the primary nucleus, which generally
         *   indicates a fission event.
         */
        atomicWeightChanged: function(nucleus, byProducts) {
            if (byProducts) {
                var angle;
                var xVel;
                var yVel;
                // There are some byproducts of this event that need to be
                //   managed by this object.
                for (var i = 0; i < byProducts.length; i++) {
                    var byProduct = byProducts[i];
                    if (byProduct instanceof Nucleon) {
                        // Set a direction and velocity for this neutron.
                        angle = Math.random() * Math.PI / 3;
                        if (Math.random() < 0.5)
                            angle += Math.PI;
                        
                        xVel = Math.sin(angle) * OneNucleusSimulation.MOVING_NUCLEON_VELOCITY;
                        yVel = Math.cos(angle) * OneNucleusSimulation.MOVING_NUCLEON_VELOCITY;
                        byProduct.setVelocity(xVel, yVel);

                        // Add this new particle to our list.
                        this.freeNucleons.add(byProduct);
                    }
                    else if (byProduct instanceof AlphaParticle) {
                        this.freeAlphas.add(byProduct);
                    }
                    else if (byProduct instanceof AtomicNucleus) {
                        // Save the new daughter.
                        this.daughterNucleus = byProduct;

                        // Set random but opposite directions for the
                        // nuclei.  Limit them to be roughly horizontal so
                        // that they will be easier to see.
                        angle = (Math.random() * Math.PI / 3) + (Math.PI / 3);
                        if (Math.random() < 0.5)
                            angle += Math.PI;
                        
                        xVel = Math.sin(angle) * OneNucleusSimulation.INITIAL_NUCLEUS_VELOCITY;
                        yVel = Math.cos(angle) * OneNucleusSimulation.INITIAL_NUCLEUS_VELOCITY;
                        var xAcc = Math.sin(angle) * OneNucleusSimulation.INITIAL_NUCLEUS_ACCELERATION;
                        var yAcc = Math.cos(angle) * OneNucleusSimulation.INITIAL_NUCLEUS_ACCELERATION;

                        this.primaryNucleus.setVelocity(xVel, yVel);
                        this.primaryNucleus.setAcceleration(xAcc, yAcc);

                        this.initialParentAccel.set(xAcc, yAcc);
                        this.initialDaughterAccel.set(-xAcc, -yAcc);

                        this.daughterNucleus.setVelocity(-xVel, -yVel);
                        this.daughterNucleus.setAcceleration(-xAcc, -yAcc);
                    }
                    else {
                        // We should never get here, debug it if it does.
                        throw 'Error: Unexpected byproduct of decay event.';
                    }
                }
            }
        },

        neutronGenerated: function(neutron) {
            // Add this new neutron to the list of free particles.  It
            //   should already be represented in the view and thus does
            //   not need to be added to it.
            this.freeNucleons.add(neutron);
        }

    }, Constants.OneNucleusSimulation);

    return OneNucleusSimulation;
});
