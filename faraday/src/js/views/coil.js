define(function(require) {

    'use strict';

    var PIXI = require('pixi');

    var PixiView = require('common/v3/pixi/view');
    var Vector2  = require('common/math/vector2');
    var Colors   = require('common/colors/colors');

    var Assets = require('assets');

    var Constants = require('constants');
    var ELECTRON_SPACING       = Constants.CoilView.ELECTRON_SPACING;
    var ELECTRONS_IN_LEFT_END  = Constants.CoilView.ELECTRONS_IN_LEFT_END;
    var ELECTRONS_IN_RIGHT_END = Constants.CoilView.ELECTRONS_IN_RIGHT_END;

    /**
     * CoilGraphic is the graphical representation of a coil of wire.
     * In order to simulate objects passing "through" the coil, the coil graphic
     * consists of two layers, called the "foreground" and "background".
     * 
     * The coil is drawn as a set of curves, with a "wire end" joined at the each
     * end of the coil.  The wire ends is where things can be connected to the coil
     * (eg, a lightbulb or voltmeter). 
     * 
     * The coil optionally shows electrons flowing. The number of electrons is 
     * a function of the coil radius and number of loops.  Electrons are part of 
     * the simulation model, and they know about the path that they need to follow.
     * The path is a describe by a set of ElectronPathDescriptors.
     * 
     * The set of ElectronPathDescriptors contains the information that the electrons
     * need to determine which layer that are in (foreground or background) 
     * and how to adjust ("scale") their speed so that they appear to flow at
     * the same rate in all curve segments.  (For example, the wire ends are
     * significantly shorter curves that the other segments in the coil.) 
     * 
     * WARNING!  The updateCoil method in particular is very complicated, and
     * the curves that it creates have been tuned so that all curve segments 
     * are smoothly joined to form a 3D-looking coil.  If you change values,
     * do so with caution, test frequently, and perform a close visual 
     * inspection of your changes.
     */
    var CoilView = PixiView.extend({

        /**
         * Initializes the new CoilView.
         */
        initialize: function(options) {
            this.mvt = options.mvt;
            this.simulation = options.simulation;

            this.electronAnimationEnabled = true;
            this.foregroundColor   = Colors.parseHex(CoilView.FOREGROUND_COLOR);
            this.middlegroundColor = Colors.parseHex(CoilView.MIDDLEGROUND_COLOR);
            this.backgroundColor   = Colors.parseHex(CoilView.BACKGROUND_COLOR);
            
            this.electronPath = [];
            this.electrons = [];
            
            this.numberOfLoops = -1; // force update
            this.loopRadius    = -1; // force update
            this.wireWidth     = -1; // force update
            this.loopSpacing   = -1; // force update
            this.current       = -1;  // force update
            this.electronSpeedScale = 1;
            this.endsConnected = false;

            this._dragOffset   = new PIXI.Point();
            this._dragLocation = new PIXI.Point();
            this._vec = new Vector2();
            this._endPoint = new Vector2();
            this._startPoint = new Vector2();
            this._controlPoint = new Vector2();

            this.initGraphics();
            this.update();

            this.listenTo(this.model, 'change:position',  this.updatePosition);
        },

        /**
         * Initializes everything for rendering graphics
         */
        initGraphics: function() {
            

            this.updateMVT(this.mvt);
        },

        /**
         * Enables/disables animation of current flow.
         */
        setElectronAnimationEnabled: function(enabled) {
            if (this.electronAnimationEnabled !== enabled){
                this.electronAnimationEnabled = enabled;
                this.update();
            }
        },

        enableElectronAnimation: function() {
            this.setElectronAnimationEnabled(true);
        },

        disableElectronAnimation: function() {
            this.setElectronAnimationEnabled(false);
        },
        
        /**
         * Determines whether animation of current flow is enabled.
         */
        isElectronAnimationEnabled: function() {
            return this.electronAnimationEnabled;
        },

        /**
         * Sets the scale used for electron speed.
         *
         * @param electronSpeedScale
         */
        setElectronSpeedScale: function(electronSpeedScale) {
            if (electronSpeedScale !== this.electronSpeedScale) {
                this.electronSpeedScale = electronSpeedScale;
                // Update all electrons
                var numberOfElectrons = this.electrons.length;
                for (var i = 0; i < numberOfElectrons; i++)
                    this.electrons[i].set('speedScale', this.electronSpeedScale);
            }
        },

        setEndsConnected: function(endsConnected) {
            if (endsConnected !== this.endsConnected) {
                this.endsConnected = endsConnected;
                this.updateCoil();
            }
        }
        
        isEndsConnected: function() {
            return this.endsConnected;
        },

        /**
         * Updates the view to match the model.
         */
        update: function() {
            if ( isVisible() ) {
                
                boolean dirty = false;
                
                // Update the physical appearance of the coil.
                if ( coilChanged() ) {
                    dirty = true;
                    updateCoil();
                }
                
                // Change the speed/direction of electrons to match the voltage.
                if ( _electronAnimationEnabled && electronsChanged() ) {
                    dirty = true;
                    updateElectrons();
                }
                       
                if ( dirty ) {
                    repaint();
                }
            }
        },

        /**
         * Updates the model-view-transform and anything that
         *   relies on it.
         */
        updateMVT: function(mvt) {
            this.mvt = mvt;

            

            this.updatePosition(this.model, this.model.get('position'));
        },

        updatePosition: function(model, position) {
            var viewPosition = this.mvt.modelToView(position);
            this.displayObject.x = viewPosition.x;
            this.displayObject.y = viewPosition.y;
        },

        /**
         * Updates the coil, recreating all graphics and electron model elements.
         * 
         * WARNING! A lot of time was spent tweaking points so that the curves appear
         * to form one 3D continuous coil.  Be very careful what you change, and visually 
         * inspect the results closely.
         */
        updateCoil: function() {
            // Start with a clean slate.
            this.foreground.removeChildren();
            this.background.removeChildren();

            // Clear electron path descriptions
            this.clearElectronPath();

            // Remove electrons from model
            this.clearElectrons();

            // Draw the loops
            var radius = this.mvt.modelToViewDeltaX(this.model.get('radius'));
            var numberOfLoops = this.model.get('numberOfLoops');
            var loopSpacing = parseInt(this.mvt.modelToViewDeltaX(this.model.get('loopSpacing')));
            var wireWidth = this.mvt.modelToViewDeltaX(this.model.get('wireWidth'));
            
            // Start at the left-most loop, keeping the coil centered.
            var xStart = -(loopSpacing * (numberOfLoops - 1) / 2);
            
            var leftEndPoint;
            var rightEndPoint;

            // Create canvases to draw to because we're drawing gradients
            var bg = this.background;
            var bgCanvas = this.createCoilCanvas();
            var bgCtx = bgCanvas.getContext('2d');
            var fg = this.foreground;
            var fgCanvas = this.createCoilCanvas();
            var fgCtx = fgCanvas.getContext('2d');

            fgCtx.lineWidth = bgCtx.lineWidth = wireWidth;
            fgCtx.lineJoin = bgCtx.lineJoin = 'bevel';
            fgCtx.lineCap = bgCtx.lineCap = 'round';
            
            // Create the wire ends & loops from left to right.
            // Curves are created in the order that they are pieced together.
            for (var i = 0; i < numberOfLoops; i++) {
                var xOffset = xStart + (i * loopSpacing);
                
                // If first loop (left)
                if (i === 0) {     
                    // Left wire end
                    leftEndPoint = this.createWireLeftEnd(bg, bgCtx, loopSpacing, xOffset, radius);

                    // Back top (left-most) is slightly different so it connects to the left wire end.
                    this.createWireLeftBackTop();
                }
                else {
                    // Back top (no wire end connected)
                    this.createWireBackTop();
                }
                
                // Back bottom
                this.createWireBackBottom();
                
                // Front bottom
                this.createWireFrontBottom();

                // Front top
                this.createWireFrontTop();
                
                // If last loop (right)
                if (i === numberOfLoops - 1) {
                    // Right wire end
                    rightEndPoint = this.createWireRightEnd();
                }
            }

            // Connect the ends
            if ( _endsConnected ) {
                
                Line2D line = new Line2D.Double( leftEndPoint.getX(), leftEndPoint.getY(), rightEndPoint.getX(), rightEndPoint.getY() );
                PhetShapeGraphic shapeGraphic = new PhetShapeGraphic( _component );
                
                Paint paint = _middlegroundColor;
                
                shapeGraphic.setShape( line );
                shapeGraphic.setStroke( loopStroke );
                shapeGraphic.setBorderPaint( paint );
                _foreground.addGraphic( shapeGraphic );
            }

            // Create sprites from the canvases
            var bgSprite = new PIXI.Sprite(PIXI.Texture.fromCanvas(bgCanvas));
            var fgSprite = new PIXI.Sprite(PIXI.Texture.fromCanvas(fgCanvas));
            bgSprite.anchor.x = bgSprite.anchor.y = 0.5;
            fgSprite.anchor.x = fgSprite.anchor.y = 0.5;
            bg.addChild(bgSprite);
            fg.addChild(fgSprite);
            
            // Add electrons to the coil.
            var speed = this.calculateElectronSpeed();
            
            var leftEndIndex = 0;
            var rightEndIndex = this.electronPath.length - 1;

            // For each curve...
            for (var pathIndex = 0; pathIndex < this.electronPath.length; pathIndex++) {
                /*
                 * The wire ends are a different size, 
                 * and therefore contain a different number of electrons.
                 */
                var numberOfElectrons;
                if (pathIndex === leftEndIndex)
                    numberOfElectrons = ELECTRONS_IN_LEFT_END;
                else if (pathIndex === rightEndIndex)
                    numberOfElectrons = ELECTRONS_IN_RIGHT_END;
                else
                    numberOfElectrons = Math.floor(radius / ELECTRON_SPACING);

                // Add the electrons to the curve.
                for (var i = 0; i < numberOfElectrons; i++) {

                    var pathPosition = i / numberOfElectrons;

                    // Model
                    var electron = new Electron({
                        speed: speed,
                        speedScale: this.electronSpeedScale,
                        enabled: this.electronAnimationEnabled
                    }, {
                        path: this.electronPath,
                        pathIndex: pathIndex,
                        pathPosition: pathPosition
                    });

                    this.electrons.push(electron);
                    this.simulation.addElectron(electron);

                    // View
                    var descriptor = electron.getPathDescriptor();
                    var parent = descriptor.getParent();
                    var electronView = new ElectronView({ model: electron });
                    parent.addChild(electronView.displayObject);
                    descriptor.getParent().addGraphic( electronView );
                }
            }
        },

        createCoilCanvas: function() {
            var canvas = document.createElement('canvas');
            canvas.width  = this.getWidth();
            canvas.height = this.getHeight();
            return canvas;
        },

        clearElectronPath: function() {
            for (var i = this.electronPath.length - 1; i >= 0; i--)
                this.electronPath.splice(i, 1);
        },

        clearElectrons: function() {
            this.simulation.clearElectrons();
        },

        drawQuadBezierSpline: function(ctx, spline, startColor, endColor, x1, y1, x2, y2) {
            if (endColor !== undefined) {
                var gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                gradient.addColorStop(0, startColor);
                gradient.addColorStop(1, endColor);

                ctx.strokeStyle = gradient;
            }
            else {
                ctx.strokeStyle = startColor;
            }

            ctx.moveTo(curve.x1, curve.y1);
            ctx.quadraticCurveTo(curve.cx, curve.cy, curve.x2, curve.y2);
        },

        /**
         * Left wire end. Returns the left end point
         */
        createWireLeftEnd: function(background, ctx, loopSpacing, xOffset, radius) {
            var endPoint = this._endPoint.set(-loopSpacing / 2 + xOffset, Math.floor(-radius)); // lower
            var startPoint = this._startPoint.set(endPoint.x - 15, endPoint.y - 40); // upper
            var controlPoint = this._controlPoint.set(endPoint.x - 20, endPoint.y - 20);
            var curve = new QuadBezierSpline(startPoint, controlPoint, endPoint);
            
            // Scale the speed, since this curve is different than the others in the coil.
            var speedScale = (radius / ELECTRON_SPACING) / ELECTRONS_IN_LEFT_END;
            var d = new ElectronPathDescriptor(curve, background, ElectronPathDescriptor.BACKGROUND, speedScale);
            this.electronPath.push(d);
            
            // Horizontal gradient, left to right.
            this.drawQuadBezierSpline(ctx, curve, this.middlegroundColor, this.backgroundColor, startPoint.x, 0, endPoint.x, 0);
            
            return startPoint;
        },

        /**
         * Back top (left-most) is slightly different so it connects to the left wire end
         */
        createWireLeftBackTop: function(background, ctx, loopSpacing, xOffset, radius) {
            var startPoint = this._startPoint.set(-loopSpacing / 2 + xOffset, Math.floor(-radius)); // upper
            var endPoint = this._endPoint.set(Math.floor(radius * 0.25) + xOffset, 0); // lower
            var controlPoint = this._controlPoint.set(Math.floor(radius * 0.15) + xOffset, Math.floor(-radius * 0.70));
            var curve = new QuadBezierSpline(startPoint, controlPoint, endPoint);

            var d = new ElectronPathDescriptor(curve, background, ElectronPathDescriptor.BACKGROUND);
            this.electronPath.push(d);
            
            this.drawQuadBezierSpline(ctx, curve, this.backgroundColor);
        },

        /**
         * Back top (no wire end connected)
         */
        createWireBackTop: function(background, ctx, loopSpacing, xOffset, radius) {
            var startPoint = this._startPoint.set(-loopSpacing + xOffset, Math.floor(-radius)); // upper
            var endPoint = this._endPoint.set(Math.floor(radius * 0.25) + xOffset, 0); // lower
            var controlPoint = this._controlPoint.set(Math.floor(radius * 0.15) + xOffset, Math.floor(-radius * 1.20));
            var curve = new QuadBezierSpline( startPoint, controlPoint, endPoint );

            var d = new ElectronPathDescriptor( curve, background, ElectronPathDescriptor.BACKGROUND );
            this.electronPath.push(d);

            // Diagonal gradient, upper left to lower right.
            this.drawQuadBezierSpline(
                ctx, curve, this.middlegroundColor, this.backgroundColor, 
                Math.floor(startPoint.x + (radius * 0.10)), -Math.floor(radius), 
                xOffset, -Math.floor(radius * 0.92)
            );
        },

        /**
         * Back bottom
         */
        createWireBackBottom: function(background, ctx, xOffset, radius) {
            var startPoint = this._startPoint.set(Math.floor(radius * 0.25) + xOffset, 0); // upper
            var endPoint = this._endPoint.set(xOffset, Math.floor(radius)); // lower
            var controlPoint = this._controlPoint.set(Math.floor(radius * 0.35) + xOffset, Math.floor(radius * 1.20));
            var curve = new QuadBezierSpline(startPoint, controlPoint, endPoint);

            var d = new ElectronPathDescriptor(curve, background, ElectronPathDescriptor.BACKGROUND);
            this.electronPath.push(d);

            // Vertical gradient, upper to lower
            this.drawQuadBezierSpline(ctx, curve, this.backgroundColor, this.middlegroundColor, 0, Math.floor(radius * 0.92), 0, Math.floor(radius));
        },

        /**
         * Front bottom
         */
        createWireFrontBottom: function(foreground, ctx, xOffset, radius) {
            var startPoint = this._startPoint.set( xOffset, Math.floor(radius)); // lower
            var endPoint = this._endPoint.set(Math.floor(-radius * 0.25) + xOffset, 0); // upper
            var controlPoint = this._controlPoint.set(Math.floor(-radius * 0.25) + xOffset, Math.floor(radius * 0.80));
            var curve = new QuadBezierSpline(startPoint, controlPoint, endPoint);

            var d = new ElectronPathDescriptor(curve, foreground, ElectronPathDescriptor.FOREGROUND);
            this.electronPath.push(d);

            // Horizontal gradient, left to right
            this.drawQuadBezierSpline(
                ctx, curve, this.foregroundColor, this.middlegroundColor, 
                Math.floor(-radius * 0.25) + xOffset, 0, 
                Math.floor(-radius * 0.15) + xOffset, 0
            );
        },

        /**
         * Front top
         */
        createWireFrontTop: function(foreground, ctx, loopSpacing, xOffset, radius) {
            var startPoint = this._startPoint.set(Math.floor(-radius * 0.25) + xOffset, 0); // lower
            var endPoint = this._endPoint.set(xOffset, Math.floor(-radius)); // upper
            var controlPoint = this._controlPoint.set(Math.floor(-radius * 0.25) + xOffset, Math.floor(-radius * 0.80));
            var curve = new QuadBezierSpline( startPoint, controlPoint, endPoint );

            var d = new ElectronPathDescriptor(curve, foreground, ElectronPathDescriptor.FOREGROUND);
            this.electronPath.push(d);
            
            // Horizontal gradient, left to right
            this.drawQuadBezierSpline(
                ctx, curve, this.foregroundColor, this.middlegroundColor, 
                Math.floor(-radius * 0.25) + xOffset, 0, 
                Math.floor(-radius * 0.15) + xOffset, 0
            );
        },

        /**
         * Right wire end. Returns right end point
         */
        createWireRightEnd: function(foreground, ctx, loopSpacing, xOffset, radius) {
            var startPoint = this._startPoint.set(xOffset, Math.floor(-radius)); // lower
            var endPoint = this._endPoint.set(startPoint.x + 15, startPoint.y - 40); // upper
            var controlPoint = this._controlPoint.set(startPoint.x + 20, startPoint.y - 20);
            var curve = new QuadBezierSpline(startPoint, controlPoint, endPoint);

            // Scale the speed, since this curve is different than the others in the coil.
            var speedScale = (radius / ELECTRON_SPACING) / ELECTRONS_IN_RIGHT_END;
            var d = new ElectronPathDescriptor(curve, foreground, ElectronPathDescriptor.FOREGROUND, speedScale);
            this.electronPath.push(d);

            this.drawQuadBezierSpline(ctx, curve, this.middlegroundColor);
            
            return endPoint;
        },

        getWidth: function() {
            var numberOfLoops = this.model.get('numberOfLoops');
            var loopSpacing = parseInt(this.mvt.modelToViewDeltaX(this.model.get('loopSpacing')));
            var wireWidth = this.mvt.modelToViewDeltaX(this.model.get('wireWidth'));
            return (numberOfLoops * loopSpacing) * 2 + wireWidth;
        },

        getHeight: function() {
            var radius = this.mvt.modelToViewDeltaX(this.model.get('radius'));
            return 2 * (radius * 1.2);
        },

        /**
         * Calculates the speed of electrons, a function of the voltage across the coil.
         * Direction is indicated by the sign of the value.
         * Magnitude of 0 indicates no motion.
         * Magnitude of 1 moves along an entire curve segment in one clock tick.
         */
        calculateElectronSpeed: function() {
            var currentAmplitude = this.model.get('currentAmplitude');
            // Current below the threshold is effectively zero.
            if (Math.abs(currentAmplitude) < Constants.CURRENT_AMPLITUDE_THRESHOLD)
                currentAmplitude = 0;
            
            return currentAmplitude;
        }

    }, Constants.CoilView);


    return CoilView;
});