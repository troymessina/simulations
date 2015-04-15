define(function(require) {

    'use strict';

    var PIXI = require('pixi');
    
    var PixiView  = require('common/pixi/view');
    var ArrowView = require('common/pixi/view/arrow');
    var Colors    = require('common/colors/colors');
    //var Vector2  = require('common/math/vector2');

    var defineInputUpdateLocks = require('common/locks/define-locks');

    var Constants = require('constants');

    var BallView = PixiView.extend({

        events: {
            'touchstart      .ball': 'dragStart',
            'mousedown       .ball': 'dragStart',
            'touchmove       .ball': 'drag',
            'mousemove       .ball': 'drag',
            'touchend        .ball': 'dragEnd',
            'mouseup         .ball': 'dragEnd',
            'touchendoutside .ball': 'dragEnd',
            'mouseupoutside  .ball': 'dragEnd',

            'touchstart      .velocityMarker': 'dragVelocityStart',
            'mousedown       .velocityMarker': 'dragVelocityStart',
            'touchmove       .velocityMarker': 'dragVelocity',
            'mousemove       .velocityMarker': 'dragVelocity',
            'touchend        .velocityMarker': 'dragVelocityEnd',
            'mouseup         .velocityMarker': 'dragVelocityEnd',
            'touchendoutside .velocityMarker': 'dragVelocityEnd',
            'mouseupoutside  .velocityMarker': 'dragVelocityEnd'
        },

        initialize: function(options) {
            options = _.extend({
                interactionEnabled: true
            }, options);

            this.color = Colors.parseHex(this.model.get('color'));
            this.interactionEnabled = options.interactionEnabled;
            this.mvt = options.mvt;

            this.arrowViewModel = new ArrowView.ArrowViewModel({
                originX: 0,
                originY: 0
            });

            this._dragOffset   = new PIXI.Point();
            this._dragLocation = new PIXI.Point();

            this.initGraphics();

            this.listenTo(this.model, 'change:position', this.updatePosition);
            this.listenTo(this.model, 'change:velocity', this.updateVelocity);
            this.listenTo(this.model, 'change:radius', this.drawBall);

            this.listenTo(this.arrowViewModel, 'change:targetX change:targetY', this.changeVelocity);
        },

        initGraphics: function() {
            this.ball = new PIXI.Graphics();
            this.ball.buttonMode = true;
            this.ball.defaultCursor = 'move';

            this.arrowView = new ArrowView({ 
                model: this.arrowViewModel,

                tailWidth:  BallView.ARROW_TAIL_WIDTH,
                headWidth:  BallView.ARROW_HEAD_WIDTH,
                headLength: BallView.ARROW_HEAD_LENGTH,

                fillColor: BallView.ARROW_COLOR,
                fillAlpha: BallView.ARROW_ALPHA
            });

            this.initVelocityMarker();
            
            this.displayObject.addChild(this.velocityMarker);
            this.displayObject.addChild(this.ball);
            this.displayObject.addChild(this.arrowView.displayObject);

            this.updateMVT(this.mvt);
        },

        initVelocityMarker: function() {
            this.velocityMarker = new PIXI.DisplayObjectContainer();
            this.velocityMarker.hitArea = new PIXI.Circle(0, 0, BallView.VELOCITY_MARKER_RADIUS);
            this.velocityMarker.buttonMode = true;

            var color = Colors.parseHex(BallView.VELOCITY_MARKER_COLOR);

            var circle = new PIXI.Graphics();
            circle.lineStyle(BallView.VELOCITY_MARKER_THICKNESS, color, BallView.VELOCITY_MARKER_ALPHA);
            circle.drawCircle(0, 0, BallView.VELOCITY_MARKER_RADIUS);

            var label = new PIXI.Text('V', {
                font: BallView.VELOCITY_MARKER_FONT,
                fill: BallView.VELOCITY_MARKER_COLOR
            });
            label.anchor.x = 0.5
            label.anchor.y = 0.4;
            label.alpha = BallView.VELOCITY_MARKER_ALPHA;

            this.velocityMarker.addChild(circle);
            this.velocityMarker.addChild(label);
        },

        drawBall: function() {
            var radius = this.mvt.modelToViewDeltaX(this.model.get('radius'));

            this.ball.clear();
            this.ball.beginFill(this.color, 1);
            this.ball.drawCircle(0, 0, radius);
            this.ball.endFill();
        },

        dragStart: function(data) {
            if (!this.interactionEnabled)
                return;

            this.dragOffset = data.getLocalPosition(this.displayObject, this._dragOffset);
            this.dragging = true;
        },

        drag: function(data) {
            if (this.dragging) {
                var dx = data.global.x - this.displayObject.x - this.dragOffset.x;
                var dy = data.global.y - this.displayObject.y - this.dragOffset.y;
                
                this.displayObject.x += dx;
                this.displayObject.y += dy;

                var x = Math.round(this.mvt.viewToModelX(this.displayObject.x));
                var y = Math.round(this.mvt.viewToModelY(this.displayObject.y));

                this.inputLock(function() {
                    this.model.set('initX', x);
                    this.model.set('initY', y);
                });
            }
        },

        dragEnd: function(data) {
            this.dragging = false;
        },

        dragVelocityStart: function(data) {
            if (!this.interactionEnabled)
                return;

            this.dragOffset = data.getLocalPosition(this.velocityMarker, this._dragOffset);
            this.draggingVelocity = true;
        },

        dragVelocity: function(data) {
            if (this.draggingVelocity) {
                var local = data.getLocalPosition(this.displayObject, this._dragLocation);
                var x = local.x - this.dragOffset.x;
                var y = local.y - this.dragOffset.y;
                
                this.velocityMarker.x = x;
                this.velocityMarker.y = y;

                this.arrowViewModel.set('targetX', this.velocityMarker.x);
                this.arrowViewModel.set('targetY', this.velocityMarker.y);
            }
        },

        dragVelocityEnd: function(data) {
            this.draggingVelocity = false;
        },

        updateVelocity: function(model, velocity) {
            this.updateLock(function() {
                var viewVelocity = this.mvt.modelToViewDelta(velocity);
                this.velocityMarker.x = viewVelocity.x;
                this.velocityMarker.y = viewVelocity.y;
                // We don't want it to draw twice, so make the first silent
                this.arrowViewModel.set('targetX', viewVelocity.x);
                this.arrowViewModel.set('targetY', viewVelocity.y);
            });
        },

        changeVelocity: function() {
            this.inputLock(function() {
                this.model.set('initVX', Math.round(this.mvt.viewToModelDeltaX(this.arrowViewModel.get('targetX'))));
                this.model.set('initVY', Math.round(this.mvt.viewToModelDeltaY(this.arrowViewModel.get('targetY'))));
            });
        },

        updatePosition: function(model, position) {
            this.updateLock(function() {
                var viewPos = this.mvt.modelToView(position);
                this.displayObject.x = viewPos.x;
                this.displayObject.y = viewPos.y;
            });
        },

        updateMVT: function(mvt) {
            this.mvt = mvt;

            this.drawBall();
            this.updatePosition(this.model, this.model.get('position'));
            this.updateVelocity(this.model, this.model.get('velocity'));
        },

        enableInteraction: function() {
            this.interactionEnabled = true;
            this.ball.buttonMode = true;
            this.velocityMarker.visible = true;
            this.arrowView.show();
        },

        disableInteraction: function() {
            this.interactionEnabled = false;
            this.ball.buttonMode = false;
            this.velocityMarker.visible = false;
            this.arrowView.hide();
        }

    }, Constants.BallView);


    // Add input/update locking functionality to the prototype
    defineInputUpdateLocks(BallView);


    return BallView;
});