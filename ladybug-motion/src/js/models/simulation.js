define(function (require, exports, module) {

    'use strict';

    var _ = require('underscore');
    var Pool = require('object-pool');

    var Simulation = require('common/simulation/simulation');
    var MotionMath = require('common/math/motion');

    var Ladybug             = require('models/ladybug');
    var SamplingMotionModel = require('models/sampling-motion-model');

    /**
     * Constants
     */
    var Constants = require('constants');

    /**
     * Object pooling
     */
    var penPathEntryPool = Pool({
        init: function() {
            return {};
        },
        enable: function(point) {
            point.time = 0;
            point.x = 0;
            point.y = 0;
        }
    });

    /**
     * The bulk of the logic for the simulation model resides here.
     */
    var LadybugMotionSimulation = Simulation.extend({

        defaults: _.extend(Simulation.prototype.defaults, {

        }),
        
        initialize: function(attributes, options) {
            this.ladybug = new Ladybug();

            // Stuff for directing the motion of the ladybug:
            //   We're pretending there is a virtual pen that is drawing a path
            //   of where we want the ladybug to go.  It can either be from the
            //   user dragging the ladybug around the screen or from the remote
            //   control arrows.
            this.samplingMotionModel = new SamplingMotionModel();
            this.penPath = []; // Holds the pen positions and the time they were taken
            this.penDown = false; // Whether or not the "pen" is down--whether we're receiving input
            this.penPoint = new Vector2(); // Current position of the pen

            // State history
            this.modelHistory = [];

            // Object caches
            this._lastSamplePoint = new Vector2();
            this._velocity = new Vector2();
            this._acceleration = new Vector2();

            this.initEstimationObjects();

            Simulation.prototype.initialize.apply(this, [attributes, options]);
        },

        /**
         * We store our derivative-estimation arrays and the
         *   objects contained therein in order that we might
         *   reuse them and not cause unnecessary waste each
         *   frame.  This function sets it all up in the very
         *   beginning.
         */
        initEstimationObjects: function() {
            this.xTimeSeries = [];
            this.yTimeSeries = [];

            for (var i = 0; i < Constants.ESTIMATION_SAMPLE_SIZE; i++) {
                this.xTimeSeries.push({ time: 0, value: 0 });
                this.yTimeSeries.push({ time: 0, value: 0 });
            }
        },

        /**
         * Initializes the models used in the simulation
         */
        initComponents: function() {
            
        },

        /**
         * Function called by Simulation.update only when the
         *   simulation is not paused.  It's just an update
         *   function that assumes not paused.
         */
        _update: function(time, deltaTime) {
            
        },

        /**
         * The update function for when we are in position mode
         *   (when the ladybug is driven by its position--or in
         *   this case driven by the pen points that indirectly
         *   determine position), this function updates all of
         *   the ladybug's motion properties according to the
         *   time (time between steps).
         */
        updatePositionMode: function(deltaTime) {
            if (!this.penDown) {
                this.updateVelocityMode(deltaTime);
                if (this.penPath.length > 2) {
                    this.penPoint = this.ladybug.get('position');
                    this.appendCurrentPenPointToPath();
                    this.samplingMotionModel.addPointAndUpdate(this.getLastSamplePoint());
                }
            }
            else {
                if (this.penPath.length > 2) {
                    this.samplingMotionModel.addPointAndUpdate(this.getLastSamplePoint());
                    this.ladybug.setPosition(this.samplingMotionModel.getAverageMid());

                    // PhET: added fudge factors for getting the scale right with 
                    //   current settings of [samplingMotionModel and] used 
                    //   spreadsheet to make sure model v and a are approximately 
                    //   correct.
                    var vscale = (1 / deltaTime) / 10;
                    var ascale = vscale * vscale * 3.835;
                    this.ladybug.setVelocity(this.samplingMotionModel.getVelocity().scale(vscale));
                    this.ladybug.setAcceleration(this.samplingMotionModel.getAcceleration().scale(ascale));
                }
                else {
                    this.ladybug.setVelocity(0, 0);
                    this.ladybug.setAcceleration(0, 0);
                }

                this.pointInDirectionOfMotion();
            }
        },

        /**
         * The update function for when we are in velocity mode
         *   (when the ladybug is driven by its velocity), this
         *   function updates all of the ladybug's motion
         *   properties according to the delta time (time
         *   between steps).
         */
        updateVelocityMode: function(deltaTime) {
            if (this.penPath.length > 0)
                this.samplingMotionModel.addPointAndUpdate(this.getLastSamplePoint());

            this.ladybug.updatePositionFromVelocity(deltaTime);
            this.ladybug.setAcceleration(this.estimateAcceleration());
            
            this.pointInDirectionOfMotion();
        },

        /**
         * The update function for when we are in acceleration 
         *   mode (when the ladybug is driven by its 
         *   acceleration), this function updates all of the
         *   ladybug's motion properties according to the
         *   delta time (time between steps).
         */
        updateAccelerationMode: function(deltaTime) {
            this.ladybug.updatePositionFromVelocity(deltaTime);
            this.ladybug.updateVelocity(deltaTime);
            this.pointInDirectionOfMotion();
        },

        /**
         * Takes the current pen point, which is stored in
         *   the property this.penPoint, and creates a pen
         *   path entry out of it (attaching the current
         *   time) and then appends it to the pen path.
         */
        appendCurrentPenPointToPath: function(time) {
            var pathEntry = penPathEntryPool.create();
            pathEntry.time = time;
            pathEntry.x = this.penPoint.x;
            pathEntry.y = this.penPoint.y;
            this.penPath.push(pathEntry);
        },

        /**
         * Finds the last sample point (pen path entry) and
         *   returns it as a Vector2.
         */
        getLastSamplePoint: function() {
            return this._lastSamplePoint.set(
                this.penPath[this.penPath.length - 1].x,
                this.penPath[this.penPath.length - 1].y
            );
        },

        /**
         * Shifts the first sample off the front of the pen
         *   path array in a way that is safe for the object
         *   pool.
         */
        shiftSampleHistory: function() {
            penPathEntryPool.remove(this.penPath.shift());
        },

        /**
         * Clears pen path (sample) history in a way that is
         *   safe for the object pool.
         */
        clearSampleHistory: function() {
            for (var i = 0; i < this.penPath.length; i++)
                penPathEntryPool.remove(this.penPath[i]);
            this.penPath.splice(0, this.penPath.length);
        },

        /**
         * Clears state and sample history.
         */
        clearHistory: function() {
            this.modelHistory.slice(0, this.modelHistory.length);
            this.clearSampleHistory();
        },

        /**
         * Rotates the ladybug model to the estimated direction
         *   of motion only if it is moving.
         */
        pointInDirectionOfMotion: function() {
            if (this.estimateVelocity().length() > 1E-6)
                this.ladybug.set('angle', this.estimateAngle());
        },

        /**
         * Returns an estimated angle in radians that is derived
         *   from the estimated velocity vector.
         */
        estimateAngle: function() {
            return this.estimateVelocity().angle();
        },

        /**
         * Estimates velocity from historical positions.
         * Note: The original version has an index parameter,
         *   but they must have refactored the function at
         *   some point and didn't update the references to
         *   it, so I've gone through and changed all the
         *   calls because it seemed to be ignoring the index
         *   parameter anyway.
         */
        estimateVelocity: function() {
            var xTimeSeries = this.xTimeSeries;
            var yTimeSeries = this.yTimeSeries;

            var historySample = this.modelHistory.slice(this.modelHistory.length - Constants.ESTIMATION_SAMPLE_SIZE, this.modelHistory.length);
            for (var i = 0; i < historySample.length; i++) {
                xTimeSeries[i].time  = historySample[i].time;
                xTimeSeries[i].value = historySample[i].state.position.x;

                yTimeSeries[i].time  = historySample[i].time;
                yTimeSeries[i].value = historySample[i].state.position.y;
            }

            var vx = MotionMath.estimateDerivative(xTimeSeries);
            var vy = MotionMath.estimateDerivative(yTimeSeries);

            return this._velocity.set(vx, vy);
        },

        /**
         * Estimates acceleration from historical velocities.
         * Note: The original version has an index parameter,
         *   but they must have refactored the function at
         *   some point and didn't update the references to
         *   it, so I've gone through and changed all the
         *   calls because it seemed to be ignoring the index
         *   parameter anyway.
         */
        estimateAcceleration: function() {
            var xTimeSeries = this.xTimeSeries;
            var yTimeSeries = this.yTimeSeries;

            var historySample = this.modelHistory.slice(this.modelHistory.length - Constants.ESTIMATION_SAMPLE_SIZE, this.modelHistory.length);
            for (var i = 0; i < historySample.length; i++) {
                xTimeSeries[i].time  = historySample[i].time;
                xTimeSeries[i].value = historySample[i].state.velocity.x;

                yTimeSeries[i].time  = historySample[i].time;
                yTimeSeries[i].value = historySample[i].state.velocity.y;
            }

            var ax = MotionMath.estimateDerivative(xTimeSeries);
            var ay = MotionMath.estimateDerivative(yTimeSeries);

            return this._acceleration.set(ax, ay);
        }

    });

    return LadybugMotionSimulation;
});
