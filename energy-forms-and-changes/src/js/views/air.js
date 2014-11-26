define(function(require) {

	'use strict';

	//var _    = require('underscore');
	//var PIXI = require('pixi');

	var PixiView = require('common/pixi/view');

	/**
	 * A view that represents the air model
	 */
	var AirView = PixiView.extend({

		/**
		 *
		 */
		initialize: function(options) {
			this.energyChunkViews = [];

			this.listenTo(this.model, 'add-chunk',    this.chunkAdded);
			this.listenTo(this.model, 'remove-chunk', this.chunkRemoved);
		},

		update: function(time, deltaTime) {
			//this.displayObject.rotation += deltaTime * 0.0001;
		},

		chunkAdded: function(model, chunk) {
			var energyChunkView = new EnergyChunkView({
				model: chunk
			});
			this.displayObject.addChild(energyChunkView.displayObject);
			this.energyChunkViews.push(energyChunkView);
		},

		chunkRemoved: function(model, chunk) {
			var energyChunkView = _.findWhere(this.energyChunkViews, {
				model: chunk
			});
			this.displayObject.removeChild(energyChunkView.displayObject);
			this.energyChunkViews = _.without(this.energyChunkViews, energyChunkView);
		}

	});

	return AirView;
});