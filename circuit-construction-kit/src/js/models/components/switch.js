define(function (require) {

    'use strict';

    var _ = require('underscore');

    var CircuitComponent = require('models/components/circuit-component');

    var Constants = require('constants');
    var DEFAULT_HANDLE_ANGLE_OPEN = Constants.Switch.DEFAULT_HANDLE_ANGLE_OPEN;
    var HANDLE_ANGLE_CLOSED = Constants.Switch.HANDLE_ANGLE_CLOSED;

    /**
     * A switch
     */
    var Switch = CircuitComponent.extend({

        defaults: _.extend({}, CircuitComponent.prototype.defaults, {
            closed: undefined,
            handleAngle: DEFAULT_HANDLE_ANGLE_OPEN
        }),

        initialize: function(attributes, options) {
            CircuitComponent.prototype.initialize.apply(this, [attributes, options]);

            this.on('change:closed',      this.closedChanged);
            this.on('change:handleAngle', this.handleAngleChanged);

            this.closedChanged(this, this.get('closed'));
            this.set('handleAngle', this.get('closed') ? HANDLE_ANGLE_CLOSED : DEFAULT_HANDLE_ANGLE_OPEN);
        },

        closedChanged: function(model, closed) {
            if (closed)
                this.set('resistance', Constants.MIN_RESISTANCE); // A resistance change fires a kirkhoff update.
            else
                this.set('resistance', Switch.OPEN_RESISTANCE);
        },

        handleAngleChanged: function(model, handleAngle) {
            if (handleAngle === HANDLE_ANGLE_CLOSED)
                this.set('closed', true);
            else
                this.set('closed', false);
        }

    }, Constants.Switch);

    return Switch;
});