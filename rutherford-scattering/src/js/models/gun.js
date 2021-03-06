define(function (require) {

    'use strict';

    var Backbone = require('backbone');
    var Constants = require('constants');
    var Vector2 = require('common/math/vector2');

    var RayGun = Backbone.Model.extend({

        defaults: {
            on: false,
            hold: false,
            dtSinceGunFired: 0,
            center: {
                x: 0,
                y: 0
            }
        },

        initialize: function(attributes, options) {
            Backbone.Model.prototype.initialize.apply(this, [attributes, options]);
            this.particles = attributes.particles;
        },

        update: function(deltaTime, boundWidth, initialSpeed) {

            var xMin = Constants.X0_MIN/this.get('scale');
            var dtPerGunFired = ( boundWidth / initialSpeed ) / Constants.MAX_PARTICLES;
            var previousDtSinceGunFired = this.get('dtSinceGunFired');

            var dtSinceGunFired = previousDtSinceGunFired + Constants.GUN_INTENSITY * deltaTime;
            this.set('dtSinceGunFired', dtSinceGunFired);


            if (this.get('on') && !this.get('hold') && dtSinceGunFired >= dtPerGunFired ) {

                var ySign = ( Math.random() < 0.5 ? 1 : -1 );

                // random position withing model bounds
                var particleX = ySign * ( xMin + ( Math.random() * ( ( boundWidth / 2 ) - xMin ) ) );
                var particleY = -1 * boundWidth/2;

                var initialPosition = new Vector2( particleX, particleY );

                this.particles.add({
                    speed: initialSpeed,
                    defaultSpeed: initialSpeed,
                    position: initialPosition
                }, {silent: true});

                this.set('dtSinceGunFired', dtSinceGunFired % dtPerGunFired);
            }
        }

    });

    return RayGun;
});
