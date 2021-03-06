define(function(require) {

    'use strict';

    var PIXI = require('pixi');
    
    var PixiView  = require('common/v3/pixi/view');
    var Colors    = require('common/colors/colors');
    var Vector2  = require('common/math/vector2');

    var Constants = require('constants');

    /**
     * An equipotential plot (or a contour plot) draws a curve connecting
     *   every point where the value is the same--where in this case the
     *   voltage is the same.  For example, if the voltage tool were over
     *   a spot near a single positive charge where the voltage was 12 V, 
     *   and the user pressed the plot button to create an equipotential
     *   plot, a ring would be drawn around the positive charge showing 
     *   every point where the voltage is 12 V around it.
     *
     * The draw function here is based off of the GUI.traceV function in
     *   the original flash sim.
     */
    var EquipotentialPlot = PixiView.extend({

        /**
         * Overrides PixiView's initializeDisplayObject function
         */
        initializeDisplayObject: function() {
            this.displayObject = new PIXI.Graphics();
        },

        initialize: function(options) {
            options = _.extend({
                x: 0,
                y: 0
            }, options);

            this.simulation = options.simulation;
            this.x = options.x;
            this.y = options.y;

            // Set the initial MVT and draw
            this.updateMVT(options.mvt);
        },

        /**
         * This function assumes the simulation has charges.  If the 
         *   simulation does not have charges, we shouldn't be creating
         *   an equipotential plot.
         */
        draw: function() {
            var graphics = this.displayObject;
            var simulation = this.simulation;
            var mvt = this.mvt;

            var mx = this.mvt.viewToModelX(this.x);
            var my = this.mvt.viewToModelY(this.y);
            var voltage = simulation.getV(mx, my);

            var width = this.mvt.modelToViewDeltaX(simulation.get('width'));
            var height = Math.abs(this.mvt.modelToViewDeltaY(simulation.get('height')));

            graphics.lineStyle(1, 0x000000, 1);

            var delSA = 0.05;          // Step length along equipotential in meters
            var delSB = 0.05;
            var VFAC = Constants.VFAC; // Voltage conversion factor
            var tic = 0;

            var currXA = mx; // A path is clockwise movement along equipotential
            var currYA = my;
            var currXB = mx; // B path is counterclockwise movement along equipot.
            var currYB = my;

            var distSq = 0;
            var stoppingDistance = (delSA * delSA + delSB * delSB) / 4;

            var nextA;
            var nextB;
            var nextXA;
            var nextYA;
            var nextXB;
            var nextYB;

            var readyToBreak = false;


            while (tic < 500) {
                // Get the next points in both directions
                nextA = simulation.getNextEqualVoltagePoint(voltage, currXA, currYA,  delSA);
                nextXA = nextA.x;
                nextYA = nextA.y;

                nextB = simulation.getNextEqualVoltagePoint(voltage, currXB, currYB, -delSB);
                nextXB = nextB.x;
                nextYB = nextB.y;

                // Draw it
                graphics.moveTo(mvt.modelToViewX(currXA), mvt.modelToViewY(currYA));
                graphics.lineTo(mvt.modelToViewX(nextXA), mvt.modelToViewY(nextYA));

                graphics.moveTo(mvt.modelToViewX(currXB), mvt.modelToViewY(currYB));
                graphics.lineTo(mvt.modelToViewX(nextXB), mvt.modelToViewY(nextYB));

                if (readyToBreak) 
                    break;

                distSq = (nextXA - nextXB) * (nextXA - nextXB) + (nextYA - nextYB) * (nextYA - nextYB);

                // If A and B lines meet up, make one more pass through drawing loop to close up curve
                if (distSq < stoppingDistance)
                    readyToBreak = true; 

                currXA = nextXA;
                currYA = nextYA;
                currXB = nextXB;
                currYB = nextYB;
                
                tic++;
            }

            // Draw label
            var labelText = new PIXI.Text(voltage.toFixed(1) + ' V', {
                font: '14px Helvetica Neue',
                fill: '#000'
            });
            labelText.resolution = this.getResolution();
            labelText.anchor.x = 0.5;
            labelText.anchor.y = 0.551;

            var labelBackground = new PIXI.Graphics();
            labelBackground.beginFill(0xFFFFFF, 1);
            labelBackground.drawRect(
                -labelText.width / 2 - 6,
                -labelText.height / 2 - 6,
                labelText.width + 12,
                labelText.height + 6
            );
            labelBackground.endFill();
            console.log(labelText.height)

            var label = new PIXI.Container();
            label.addChild(labelBackground);
            label.addChild(labelText);
            label.x = this.x;
            label.y = this.y;

            this.label = label;
        },

        updateMVT: function(mvt) {
            this.mvt = mvt;

            this.draw();
        }

    });

    return EquipotentialPlot;
});