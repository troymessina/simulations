define(function (require) {

    'use strict';

    var Backbone = require('backbone');
    var SAT      = require('sat');

    var Vector2 = require('common/math/vector2');

    var Constants = require('constants');

    /**
     * A branch in the circuit (like the line connecting nodes in a graph).
     */
    var Branch = Backbone.Model.extend({

        defaults: {
            resistance: Constants.MIN_RESISTANCE,
            startJunction: null,
            endJunction: null,
            selected: false,
            kirkhoffEnabled: true,
            isOnFire: false,
            showReadout: false,
            // Average current (averaged over timestep subdivisions for one subdivided
            //   stepInTime) for display in an ammeter or chart
            current: 0, 
            // Instantaneous current for the MNA model (i.e. may differ from aggregate
            //   current which is displayed on screen)
            mnaCurrent: 0,
            // Average voltage drop (averaged over timestep subdivisions for one
            //   subdivided stepInTime) for display in voltmeter or chart
            voltageDrop: 0,
            // See notes above for mnaCurrent
            mnaVoltageDrop: 0
        },

        initialize: function(attributes, options) {
            
            // Cached objects
            this._directionVec = new Vector2();
            this._angleVec     = new Vector2();
            this._centerVec    = new Vector2();
            this._position     = new Vector2();

            this.on('change:startJunction', this.startJunctionChanged);
            this.on('change:endJunction',   this.endJunctionChanged);
            this.on('change:current',       this.currentChanged);

            this.startJunctionChanged(this, this.get('startJunction'));
            this.endJunctionChanged(this, this.get('endJunction'));
        },

        initShape: function(width, height) {
            width  *= Constants.SAT_SCALE;
            height *= Constants.SAT_SCALE;
            this.shape = (new SAT.Box(new SAT.Vector(0, 0), width, height)).toPolygon();
            this.shape.translate(0, -height / 2);
        },

        updateShape: function() {
            var start = this.getStartPoint();
            this.shape.pos.x = start.x * Constants.SAT_SCALE;
            this.shape.pos.y = start.y * Constants.SAT_SCALE;
            this.shape.setAngle(this.getAngle());
        },

        getShape: function() {
            this.updateShape();
            return this.shape;
        },

        intersectsPolygon: function(polygon) {
            return SAT.testPolygonPolygon(polygon, this.getShape());
        },

        containsPoint: function(point) {
            return SAT.pointInPolygon(point, this.getShape());
        },

        startJunctionChanged: function(model, startJunction) {
            if (this.previous('startJunction'))
                this.stopListening(this.previous('startJunction'));
            if (startJunction)
                this.listenTo(startJunction, 'change', this._startJunctionChanged);
            this._startJunctionChanged();
        },

        endJunctionChanged: function(model, endJunction) {
            if (this.previous('endJunction'))
                this.stopListening(this.previous('endJunction'));
            if (endJunction)
                this.listenTo(endJunction, 'change', this._endJunctionChanged);
            this._endJunctionChanged();
        },

        _startJunctionChanged: function() {
            this.trigger('start-junction-changed', this, this.get('startJunction'));
        },

        _endJunctionChanged: function() {
            this.trigger('end-junction-changed', this, this.get('endJunction'));
        },

        isFixed: function() {
            return this.get('startJunction').fixed && this.get('endJunction').fixed;
        },

        getVoltageDrop: function() {
            return this.get('voltageDrop');
        },

        getDirectionVector: function() {
            return this._directionVec.set(this.get('endJunction').get('position')).sub(this.get('startJunction').get('position'));
        },

        getX1: function() {
            return this.get('startJunction').get('position').x;
        },

        getY1: function() {
            return this.get('startJunction').get('position').y;
        },

        getX2: function() {
            return this.get('endJunction').get('position').x;
        },

        getY2: function() {
            return this.get('endJunction').get('position').y;
        },

        getStartPoint: function() {
            return this.get('startJunction').get('position');
        },

        getEndPoint: function() {
            return this.get('endJunction').get('position');
        },

        hasJunction: function(junction) {
            return this.get('endJunction') == junction || this.get('startJunction') == junction;
        },

        opposite: function(junction) {
            if (this.get('startJunction') == junction)
                return this.get('endJunction');
            else if (this.get('endJunction') == junction)
                return this.get('startJunction');
            else
                throw 'No such junction: ' + junction;
        },

        translate: function(dx, dy) {
            this.get('startJunction').translate(dx, dy);
            this.get('endJunction').translate(dx, dy);
        },

        replaceJunction: function(junction, newJ) {
            if (junction === this.get('startJunction'))
                this.set('startJunction', newJ);
            else if (junction === this.get('endJunction'))
                this.set('endJunction', newJ);
            else
                throw 'No such junction.';
        },

        getLength: function() {
            return this.get('startJunction').getDistance(this.get('endJunction'));
        },

        getPosition: function(x) {
            if (this.getLength() === 0)
                return this._position.set(this.get('startJunction').get('position'));
    
            var vec = this._position
                .set(this.get('endJunction').get('position'))
                .sub(this.get('startJunction').get('position'))
                .normalize()
                .scale(x)
                .add(this.get('startJunction').get('position'));

            return vec;
        },

        containsScalarLocation: function(x) {
            return x >= 0 && x <= this.getLength();
        },

        getAngle: function() {
            return this._angleVec
                .set(this.get('endJunction').get('position'))
                .sub(this.get('startJunction').get('position'))
                .angle();
        },

        getCenter: function() {
            var center = this._centerVec
                .set(this.get('endJunction').get('position'))
                .sub(this.get('startJunction').get('position'))
                .scale(0.5)
                .add(this.get('startJunction').get('position'));

            return center;
        },

        select: function() {
            this.set('selected', true);
        },

        deselect: function() {
            this.set('selected', false);
        },

        currentChanged: function(model, current) {
            var shouldBeOnFire = Math.abs(current) > 10;
            this.set('isOnFire', shouldBeOnFire);
        }

    });

    return Branch;
});