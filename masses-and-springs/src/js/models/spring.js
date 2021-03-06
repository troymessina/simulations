define(function (require, exports, module) {

    'use strict';

    var _ = require('underscore');

    var Backbone = require('backbone');

    /**
     * Constants
     */
    var Constants = require('constants');

    /**
     * Wraps the update function in 
     */
    var Spring = Backbone.Model.extend({

        defaults: {
            restL: Constants.SpringDefaults.REST_L,
            k : Constants.SpringDefaults.STIFFNESS,
            x : 0,
            y1 : 0,
            body: undefined //a body can be attached to the spring
            // snagged : false  //a spring is snagged if it is attached to a mass
        },

        initialize: function(attributes, options) {

            this.restL = this.get('restL'); //equilibrium length of spring, stretched length handled by bodySpringSystem and view
            this.k = this.get('k');         //spring constant
            this.x = this.get('x');         //x position of spring (middle)
            this.y1 = this.get('y1');       //y position of top of spring

            this.restY2(); //y-position of bottom of spring

            this.on('change:k', this.updateK);
            // this.on('change:y2', this.updateY2);
        },

        hang: function(body){
            this.body = body;
            this.trigger('snag');
            this.set('body', body);
        },

        unhang: function(){
            this.hang(undefined);
            this.trigger('unsnag');
            // TODO how to do spring animation?
            this.restY2();
        },

        updateY2ByDelta : function(deltaY){
            this.y2 = this.y1 + this.restL + (deltaY || 0);
            this.set('y2', this.y2);
        },

        restY2 : function(){
            this.updateY2ByDelta(0);
        },

        updateK: function(model, k){
            this.k = k;
        },

        updateY2: function(model, y2){
            this.y2 = y2;
        },

        isSnagged : function(){
            return !_.isUndefined(this.body);
        }

    });

    return Spring;
});
