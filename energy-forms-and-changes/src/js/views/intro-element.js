define(function(require) {

    'use strict';

    var _    = require('underscore');
    var PIXI = require('pixi');
    require('common/v3/pixi/extensions');
    

    var Rectangle = require('common/math/rectangle');
    var Vector2   = require('common/math/vector2');

    var PositionableView = require('views/positionable');

    var Constants = require('constants');

    var defaultMovementConstraintBounds = new Rectangle(
        Number.NEGATIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        Number.POSITIVE_INFINITY
    );

    /**
     * A view that represents an element model
     */
    var IntroElementView = PositionableView.extend({

        events: {
            'touchstart      .displayObject': 'dragStart',
            'mousedown       .displayObject': 'dragStart',
            'touchmove       .displayObject': 'drag',
            'mousemove       .displayObject': 'drag',
            'touchend        .displayObject': 'dragEnd',
            'mouseup         .displayObject': 'dragEnd',
            'touchendoutside .displayObject': 'dragEnd',
            'mouseupoutside  .displayObject': 'dragEnd',
        },

        /**
         *
         */
        initialize: function(options) {
            options = _.extend({
                fillColor: '#000000',
                fillAlpha: 1,
                lineWidth: 3,
                lineColor: '#444444',
                lineJoin:  'round',
                textColor: '#000000',
                textFont:  IntroElementView.TEXT_FONT,
                labelText: '',
                dragLayer: 'displayObject'
            }, options);

            this.movable = options.movable || false;
            this.movementConstraintBounds = options.movementConstraintBounds || defaultMovementConstraintBounds;
            this.movementConstraint = options.movementConstraint || function(model, position) { return position; };

            this.fillColor = options.fillColor;
            this.fillAlpha = options.fillAlpha;
            this.lineWidth = options.lineWidth;
            this.lineColor = options.lineColor;
            this.lineJoin  = options.lineJoin;
            this.textColor = options.textColor;
            this.textFont  = options.textFont;
            this.labelText = options.labelText;
            this.dragLayer = options.dragLayer;

            this._dragBounds = new Rectangle();
            this._dragOffset = new PIXI.Point();
            this._newPosition = new Vector2();

            PositionableView.prototype.initialize.apply(this, [options]);

            // To give some feedback on the cursor
            if (this.movable)
                this[this.dragLayer].buttonMode = true;
            else
                this[this.dragLayer].interactive = false;
        },

        calculateDragBounds: function(dx, dy) {
            var bounds = this.displayObject.getBounds();
            return this._dragBounds.set(
                bounds.x + dx,
                bounds.y + dy,
                bounds.width,
                bounds.height
            );
        },

        dragStart: function(event) {
            if (this.movable && !this.simulation.get('paused')) {
                this.dragOffset = event.data.getLocalPosition(this[this.dragLayer], this._dragOffset);
                this.dragging = true;
                this.model.set('userControlled', true);
                this.trigger('drag-start');  
            }
        },

        drag: function(event) {
            if (this.dragging) {
                var global = this[this.dragLayer].getGlobalPosition();
                var dx = event.data.global.x - global.x - this.dragOffset.x;
                var dy = event.data.global.y - global.y - this.dragOffset.y;
                
                var newBounds = this.calculateDragBounds(dx, dy);
                var constraintBounds = this.movementConstraintBounds;

                if (!constraintBounds.contains(newBounds)) {
                    var overflowLeft   = constraintBounds.left() - newBounds.left();
                    var overflowRight  = newBounds.right() - constraintBounds.right();
                    var overflowTop    = constraintBounds.bottom() - newBounds.bottom();
                    var overflowBottom = newBounds.top() - constraintBounds.top();

                    // Backtrack if we need to
                    if (overflowLeft > 0)
                        dx += overflowLeft;
                    else if (overflowRight > 0)
                        dx -= overflowRight;

                    if (overflowTop > 0)
                        dy += overflowTop;
                    else if (overflowBottom > 0)
                        dy -= overflowBottom;
                }

                dx = this.mvt.viewToModelDeltaX(dx);
                dy = this.mvt.viewToModelDeltaY(dy);

                var newPosition = this._newPosition
                    .set(this.model.get('position'))
                    .add(dx, dy);

                var validatedPosition = this.movementConstraint(this.model, newPosition);
                this.model.setPosition(validatedPosition);
                //console.log('setting from view');
            }
        },

        dragEnd: function(event) {
            this.dragging = false;
            this.dragData = null;
            this.model.set('userControlled', false);
            this.trigger('drag-end');
        },

        showEnergyChunks: function() {},

        hideEnergyChunks: function() {},

        getColor: function() {
            return '#fff';
        }

    }, Constants.IntroElementView);

    return IntroElementView;
});