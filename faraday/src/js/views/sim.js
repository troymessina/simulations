define(function (require) {

    'use strict';

    var $ = require('jquery');
    var _ = require('underscore');

    var SimView = require('common/v3/app/sim');

    var FaradaySimulation = require('models/simulation');
    var FaradaySceneView  = require('views/scene');

    var Constants = require('constants');

    var Assets = require('assets');

    require('nouislider');
    require('bootstrap');
    require('bootstrap-select');

    // CSS
    require('less!styles/sim');
    require('less!styles/playback-controls');
    require('less!common/styles/slider');
    require('less!common/styles/radio');
    require('less!bootstrap-select-less');

    // HTML
    var simHtml                = require('text!templates/sim.html');
    var barMagnetControlsHtml  = require('text!templates/bar-magnet.html');
    var pickupCoilControlsHtml = require('text!templates/pickup-coil.html');
    var playbackControlsHtml   = require('text!templates/playback-controls.html');

    /**
     * 
     */
    var FaradaySimView = SimView.extend({

        /**
         * Root element properties
         */
        tagName:   'section',
        className: 'sim-view',

        /**
         * Template for rendering the basic scaffolding
         */
        template:                      _.template(simHtml),
        barMagnetControlsTemplate:     _.template(barMagnetControlsHtml),
        pickupCoilControlsTemplate:    _.template(pickupCoilControlsHtml),
        playbackControlsPanelTemplate: _.template(playbackControlsHtml),

        /**
         * Dom event listeners
         */
        events: {
            'click .play-btn'   : 'play',
            'click .pause-btn'  : 'pause',
            'click .step-btn'   : 'step',
            
            'click .show-field-check'       : 'toggleField',
            'click .show-field-meter-check' : 'toggleFieldMeter',
            'click .inside-magnet-check'    : 'toggleInsideBarMagnet',
            'slide .strength-slider'        : 'changeStrength',
            'click .flip-polarity-btn'      : 'flipPolarity',

            'click .indicator-icon'         : 'selectIndicator',
            'click .add-pickup-loop-btn'    : 'addPickupLoop',
            'click .remove-pickup-loop-btn' : 'removePickupLoop',
            'slide .loop-area-slider'       : 'changeLoopArea',
            'click .show-pickup-coil-electrons-check' : 'togglePickupCoilElectrons'
        },

        /**
         * Inits simulation, views, and variables.
         *
         * @params options
         */
        initialize: function(options) {
            options = _.extend({
                title: 'Faraday\'s Electromagnetic Lab',
                name: 'faraday',
                link: 'legacy/faraday',
                hideCompass: false
            }, options);

            this.hideCompass = options.hideCompass;

            SimView.prototype.initialize.apply(this, [options]);

            this.initSceneView();

            this.listenTo(this.simulation, 'change:paused', this.pausedChanged);
            this.pausedChanged(this.simulation, this.simulation.get('paused'));
        },

        /**
         * Initializes the Simulation.
         */
        initSimulation: function() {
            this.simulation = new FaradaySimulation();
        },

        /**
         * Initializes the SceneView.
         */
        initSceneView: function() {
            this.sceneView = new FaradaySceneView({
                simulation: this.simulation
            });
        },

        /**
         * Renders everything
         */
        render: function() {
            this.$el.empty();

            this.renderScaffolding();
            this.renderSceneView();

            return this;
        },

        /**
         * Renders page content. Should be overriden by child classes
         */
        renderScaffolding: function() {
            var data = {
                Constants: Constants,
                simulation: this.simulation
            };
            this.$el.html(this.template(data));
            this.$('select').selectpicker();
        },

        /**
         * Renders the playback controls at the bottom of the screen
         */
        renderPlaybackControls: function() {
            this.$playbackControls = $(this.playbackControlsPanelTemplate({ unique: this.cid }));

            this.$el.append(this.$playbackControls);
        },

        /**
         * Renders bar magnet control panel.
         */
        renderBarMagnetControls: function() {
            var data = {
                Constants: Constants,
                simulation: this.simulation,
                name: this.name,
                includeEarth: this.includeEarth,
                hideCompass: this.hideCompass
            };

            this.$('.sim-controls-wrapper').append(this.barMagnetControlsTemplate(data));

            this.$('.strength-slider').noUiSlider({
                start: 3,
                range: {
                    min: 1,
                    max: 5
                },
                connect: 'lower'
            });
        },

        /**
         * Renders bar magnet control panel.
         */
        renderPickupCoilControls: function() {
            this.indicators = [
                { src: Assets.Images.ICON_LIGHTBULB, model: this.simulation.lightbulb, selected: true},
                { src: Assets.Images.ICON_VOLTMETER, model: this.simulation.voltmeter }
            ];

            var data = {
                Constants: Constants,
                Assets: Assets,
                simulation: this.simulation,
                name: this.name,
                indicators: this.indicators
            };

            this.$('.sim-controls-wrapper').append(this.pickupCoilControlsTemplate(data));

            this.$('.loop-area-slider').noUiSlider({
                start: Constants.DEFAULT_PICKUP_LOOP_AREA,
                range: {
                    min: Constants.MIN_PICKUP_LOOP_AREA,
                    max: Constants.MAX_PICKUP_LOOP_AREA
                },
                connect: 'lower'
            });

            this.$loopArea = this.$('.loop-area-value');

            this.listenTo(this.simulation.pickupCoil, 'change:numberOfLoops', this.numPickupLoopsChanged);
        },

        /**
         * Renders the scene view
         */
        renderSceneView: function() {
            this.sceneView.render();
            this.$('.scene-view-placeholder').replaceWith(this.sceneView.el);
            this.$el.append(this.sceneView.$ui);
        },

        /**
         * Called after every component on the page has rendered to make sure
         *   things like widths and heights and offsets are correct.
         */
        postRender: function() {
            this.sceneView.postRender();
        },

        /**
         * Resets all the components of the view.
         */
        resetComponents: function() {
            SimView.prototype.resetComponents.apply(this);
            this.initSceneView();
        },

        /**
         * This is run every tick of the updater.  It updates the wave
         *   simulation and the views.
         */
        update: function(time, deltaTime) {
            // Update the model
            this.simulation.update(time, deltaTime);

            var timeSeconds = time / 1000;
            var dtSeconds   = deltaTime / 1000;

            // Update the scene
            this.sceneView.update(timeSeconds, dtSeconds, this.simulation.get('paused'));
        },

        setNeedleSpacing: function(spacing) {
            this.sceneView.setNeedleSpacing(spacing);
        },

        setNeedleSize: function(width, height) {
            this.sceneView.setNeedleSize(width, height);
        },

        /**
         * The simulation changed its paused state.
         */
        pausedChanged: function() {
            if (this.simulation.get('paused'))
                this.$el.removeClass('playing');
            else
                this.$el.addClass('playing');
        },

        toggleField: function(event) {
            if ($(event.target).is(':checked'))
                this.sceneView.showOutsideField();
            else
                this.sceneView.hideOutsideField();
        },

        toggleFieldMeter: function(event) {
            if ($(event.target).is(':checked'))
                this.sceneView.showFieldMeter();
            else
                this.sceneView.hideFieldMeter();
        },

        toggleInsideBarMagnet: function(event) {
            if ($(event.target).is(':checked'))
                this.sceneView.showInsideBarMagnet();
            else
                this.sceneView.hideInsideBarMagnet();
        },

        changeStrength: function(event) {
            var percent = parseInt($(event.target).val());
            var strength = Constants.BAR_MAGNET_STRENGTH_RANGE.lerp(percent / 100);
            this.inputLock(function() {
                this.$strengthValue.text(percent);
                this.simulation.barMagnet.set('strength', strength);
            });
        },

        flipPolarity: function(event) {
            this.simulation.barMagnet.flipPolarity();
        },

        selectIndicator: function(event) {
            var $icon = $(event.target).closest('.indicator-icon');
            $icon.addClass('selected')
            $icon.siblings().removeClass('selected');
            var index = parseInt($icon.data('index'));
            for (var i = 0; i < this.indicators.length; i++) {
                if (i === index)
                    this.indicators[i].model.set('enabled', true);
                else
                    this.indicators[i].model.set('enabled', false);
            }
        },

        addPickupLoop: function() {
            var loops = this.simulation.pickupCoil.get('numberOfLoops') + 1;
            if (loops <= Constants.MAX_PICKUP_LOOPS)
                this.simulation.pickupCoil.set('numberOfLoops', loops);
        },

        removePickupLoop: function() {
            var loops = this.simulation.pickupCoil.get('numberOfLoops') - 1;
            if (loops >= Constants.MIN_PICKUP_LOOPS)
                this.simulation.pickupCoil.set('numberOfLoops', loops);
        },

        numPickupLoopsChanged: function(model, loops) {
            this.$('.pickup-loop-count-value').html(loops);
        },

        changeLoopArea: function(event) {
            var loopArea = parseFloat($(event.target).val());
            var percent = Math.round(Constants.LOOP_AREA_RANGE.percent(loopArea) * 100);
            this.$loopArea.html(percent + '%');
            this.simulation.pickupCoil.setLoopArea(loopArea);
        },

        togglePickupCoilElectrons: function(event) {
            if ($(event.target).is(':checked'))
                this.sceneView.showPickupCoilElectrons();
            else
                this.sceneView.hidePickupCoilElectrons();
        }

    });

    return FaradaySimView;
});
