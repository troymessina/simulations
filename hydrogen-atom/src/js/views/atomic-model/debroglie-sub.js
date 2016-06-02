define(function(require) {

    'use strict';

    var PIXI = require('pixi');

    var ParticleGraphicsGenerator = require('views/particle-graphics-generator');

    var AtomicModelView = require('hydrogen-atom/views/atomic-model');

    var Constants = require('constants');
    
    /**
     * Represents the scene for the DeBroglieModel
     */
    var DeBroglieModelSubView = AtomicModelView.extend({

        /**
         * Initializes the new DeBroglieModelSubView.
         */
        initialize: function(options) {
            AtomicModelView.prototype.initialize.apply(this, arguments);

            var graphics = new PIXI.Graphics();
            graphics.beginFill(Math.random() * 0xFFFFFF, 1);
            graphics.drawCircle(500, 300, 20);
            graphics.endFill();
            this.displayObject.addChild(graphics);
        },

        initProton: function() {
            if (this.protonSprite)
                this.displayObject.removeChild(this.protonSprite);

            this.protonSprite = ParticleGraphicsGenerator.generateProton(this.particleMVT);

            var atomPosition = this.getViewPosition();
            this.protonSprite.x = atomPosition.x;
            this.protonSprite.y = atomPosition.y;

            this.displayObject.addChild(this.protonSprite);
        },

        /**
         * Updates the model-view-transform and anything that relies on it.
         */
        updateMVT: function(mvt) {
            AtomicModelView.prototype.updateMVT.apply(this, arguments);

            this.initProton();
        },

        update: function(time, deltaTime, paused) {
            AtomicModelView.prototype.update.apply(this, arguments);
        }

    });


    return DeBroglieModelSubView;
});