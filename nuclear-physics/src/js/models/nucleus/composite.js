define(function (require) {

    'use strict';

    var _ = require('underscore');

    var range   = require('common/math/range');
    var Vector2 = require('common/math/vector2');

    var AtomicNucleus = require('models/atomic-nucleus');
    var Nucleon       = require('models/nucleon');
    var AlphaParticle = require('models/alpha-particle');

    var Constants = require('constants');

    // Initialize the placement zones to be on opposite sides of one another
    var _placementZoneAngleRanges = [];
    // Keeps track of which cached angle range we're on
    var _currentPlacementZoneIndex = 0;
    var numZones = 8;
    var angleIncrement = 2 * Math.PI / numZones;
    for (var i = 0; i < numZones; i++)
        _placementZoneAngleRanges[i] = range({ min: i * angleIncrement, max: (i + 1) * angleIncrement });

    /**
     * This class represents an atomic nucleus model element that is composed of a
     *   bunch of smaller particles (i.e. nucleons and alpha particles), hence the
     *   "Composite" portion of the name.
     */
    var CompositeAtomicNucleus = AtomicNucleus.extend({

        onCreate: function(attributes, options) {
            AtomicNucleus.prototype.onCreate.apply(this, [attributes, options]);

            // List of the constituent particles that comprise this nucleus.
            this.constituents = [];
            // Used to implement the 'agitation' behavior, i.e. to make the nucleus
            //   appear to be in constant dynamic motion.
            this.agitationCount = 0;
            // Amount of agitation exhibited by nucleus, from 0 to 9.
            this.agitationFactor = AtomicNucleus.DEFAULT_AGITATION_FACTOR;
            // The number of alpha particles that will be part of the constituents
            //   of this nucleus.
            this.numAlphas = 0;

            if (options && options.constituents)
                this.initConstituentsFromArray(options.constituents);
            else
                this.initConstituentsFromCounts(this.get('numProtons'), this.get('numNeutrons'));
            
            // Set initial positions of all nucleons.
            this.setInitialNucleonPositions();

            // Set the initial agitation factor.
            this.updateAgitationFactor();
        },

        initConstituentsFromCounts: function(numProtons, numNeutrons) {
            // Figure out the proportion of the protons and neutrons that will be
            //   tied up in alpha particles. This is not based on any formula, just
            //   worked out with the educators as something that looks good and is
            //   representative enough of reality to work for this sim.  Note that
            //   below a certain atomic weight so don't put ANY nucleons into alpha
            //   particles.
            if (numProtons + numNeutrons > 50)
                this.numAlphas = ((numProtons + numNeutrons) / 2) / 4;  // Assume half of all particles are tied up in alphas.
            
            // Add the constituent particles that make up this nucleus.  We do this
            //   in such a way that the particles are interspersed in the list,
            //   particularly towards the end of the list, since this works out
            //   better for the view.
            var numFreeProtons  = numProtons  - (this.numAlphas * 2);
            var numFreeNeutrons = numNeutrons - (this.numAlphas * 2);
            var maxParticles = Math.max(Math.max(numFreeProtons, numFreeNeutrons), this.numAlphas);

            for (var i = (maxParticles - 1); i >= 0; i--) {
                if (i < this.numAlphas)
                    this.constituents.push(AlphaParticle.create());
                
                if (i < numFreeProtons)
                    this.constituents.push(Nucleon.create({ type: Nucleon.PROTON, tunnelingEnabled: true }));
                
                if (i < numFreeNeutrons)
                    this.constituents.push(Nucleon.create({ type: Nucleon.NEUTRON, tunnelingEnabled: true }));
            }
        },

        initConstituentsFromArray: function(constituents) {
            this.constituents = [];

            // Figure out the makeup of the constituents.
            var numAlphas = 0;
            var numProtons = 0;
            var numNeutrons = 0;
            for (var i = 0; i < constituents.length; i++) {
                if (constituents[i] instanceof AlphaParticle) {
                    numAlphas++;
                    numNeutrons += 2;
                    numProtons += 2;
                }
                else if (constituents[i] instanceof Nucleon) {
                    var nucleon = constituents[i];
                    if (nucleon.get('type') === Nucleon.PROTON)
                        numNeutrons++;
                    else
                        numProtons++;
                }
                else {
                    // Should never happen, debug if it does.
                    throw 'Error: Unexpected nucleus constituent type.';
                }

                this.constituents.push(constituents[i]);
            }

            this.numAlphas = numAlphas;
            this.set('numProtons', numProtons);
            this.set('numNeutrons', numNeutrons);

            // Recalculate our diameter
            this.updateDiameter();
        },

        /**
         * Update the agitation factor for this nucleus.
         */
        updateAgitationFactor: function() {},

        update: function(time, deltaTime) {
            if (this.get('paused'))
                return;

            AtomicNucleus.prototype.update.apply(this, arguments);

            if ((this.get('velocity').x !== 0) || (this.get('velocity').y !== 0)) {
                // Move the constituent particles by the velocity amount.
                var numConstituents = this.constituents.length;
                var constituent;
                for (var i = 0; i < numConstituents; i++) {
                    constituent = this.constituents[i];
                    var newPosX = constituent.get('position').x + this.get('velocity').x; 
                    var newPosY = constituent.get('position').y + this.get('velocity').y;
                    constituent.setPosition(newPosX, newPosY);
                }
            }

            var i;
            var agitationIncrement;
            
            // Move the constituent particles to create the visual effect of a
            //   very dynamic nucleus.  In order to allow different levels of
            //   agitation, we don't necessarily move all particles every time.
            if (this.agitationFactor > 0) {
                if (this.get('numNeutrons') + this.get('numProtons') > 20) {
                    // Calculate the increment to be used for creating the agitation effect
                    agitationIncrement = 20 - (2 * this.agitationFactor);
                    if (agitationIncrement <= 0)
                        agitationIncrement = 5;
                        
                    // Limit the tunneling distance, because otherwise it can look like
                    //   alpha particles are leaving the nucleus when they aren't.
                    var tunnelingRegion = Math.min(this.get('tunnelingRegionRadius'), this.get('diameter') * 1.5);

                    for (i = this.agitationCount; i < this.constituents.length; i += agitationIncrement)
                        this.constituents[i].tunnel(this.get('position'), 0, this.get('diameter') / 2, tunnelingRegion);
                    
                    this.agitationCount = (this.agitationCount + 1) % agitationIncrement;
                }
                else {
                    // Having a small number of nucleons tunneling looks too weird,
                    //   so these nucleons just vibrate a little instead.
                    if (this.agitationFactor > 0) {
                        agitationIncrement = CompositeAtomicNucleus.MAX_AGITATION_FACTOR - this.agitationFactor + 1;
                        
                        for (i = this.agitationCount; i < this.constituents.length; i += agitationIncrement)
                            this.constituents[i].jitter();
                        
                        this.agitationCount = (this.agitationCount + 1) % agitationIncrement;
                    }
                }
            }
        },

        setInitialNucleonPositions: function() {
            if (this.constituents.length == 3) {
                // This is a special case of a 3-neucleon nucleus.  Position all
                //   nucleons to be initially visible.
                var rotationOffset = Math.PI;  // In radians, arbitrary and just for looks.
                var distanceFromCenter = Constants.NUCLEON_DIAMETER / 2 / Math.cos(Math.PI / 6);
                for (var i = 0; i < 3; i++) {
                    var angle = (Math.PI * 2 / 3) * i + rotationOffset;
                    var xOffset = Math.sin(angle) * distanceFromCenter;
                    var yOffset = Math.cos(angle) * distanceFromCenter;
                    this.constituents[i].setPosition(
                        this.getX() + xOffset, 
                        this.getY() + yOffset
                    );
                }
            }
            else if (this.constituents.length < 28) {
                // Arrange the nuclei in such a way that the nucleus as a whole
                //   ends up looking pretty round.
                var minDistance = Constants.NUCLEON_DIAMETER / 4;
                var maxDistance = Constants.NUCLEON_DIAMETER / 2;
                var distanceIncrement = Constants.NUCLEON_DIAMETER / 5;
                var numberToPlacePerCycle = 2;
                var numberOfNucleiPlaced = 0;
                while (numberOfNucleiPlaced < this.constituents.length) {
                    for (var i = 0; i < numberToPlacePerCycle; i++){
                        var particle = this.constituents[this.constituents.length - 1 - numberOfNucleiPlaced];
                        this.placeNucleon(particle, this.get('position'), minDistance, maxDistance, this.getNextPlacementZone());
                        numberOfNucleiPlaced++;
                        if (numberOfNucleiPlaced >= this.constituents.length)
                            break;
                    }
                    minDistance += distanceIncrement;
                    maxDistance += distanceIncrement;
                    numberToPlacePerCycle += 6;
                }
            }
            else {
                // This is a relatively large nucleus.  Have each particle place
                //   itself randomly somewhere within the radius of the nucleus.
                var tunnelingRegion = Math.min(this.get('tunnelingRegionRadius'), this.get('diameter') * 1.5);
                for (var j = 0; j < this.constituents.length; j++)
                    this.constituents[j].tunnel(this.get('position'), 0, this.get('diameter') / 2, tunnelingRegion);
            }
        },

        placeNucleon: function(nucleon, centerPos, minDistance, maxDistance, placementZoneAngleRange) {
            var nucleonPosition = CompositeAtomicNucleus.getRandomNucleonPosition(centerPos, minDistance, maxDistance, placementZoneAngleRange);
            nucleon.setPosition(nucleonPosition);
        },

        getNextPlacementZone: function() {
            return CompositeAtomicNucleus.getNextPlacementZone();
        },

        getConstituents: function() {
            return this.constituents;
        }

    }, _.extend({

        getRandomNucleonPosition: function(centerPos, minDistance, maxDistance, placementZoneAngleRange) {
            if (!this._nucleonPosition)
                this._nucleonPosition = new Vector2();

            var distance = minDistance + Math.random() * (maxDistance - minDistance);
            var angle = placementZoneAngleRange.random();
            var xPos = centerPos.x + Math.cos(angle) * distance;
            var yPos = centerPos.y + Math.sin(angle) * distance;

            this._nucleonPosition.set(xPos, yPos);

            return this._nucleonPosition;
        },

        getNextPlacementZone: function() {
            _currentPlacementZoneIndex = (_currentPlacementZoneIndex + 1 + _placementZoneAngleRanges.length / 2) % _placementZoneAngleRanges.length;
            return _placementZoneAngleRanges[_currentPlacementZoneIndex];
        }

    }, Constants.CompositeAtomicNucleus));

    return CompositeAtomicNucleus;
});