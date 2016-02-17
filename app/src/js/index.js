'use strict';

var $ = require('jquery');
window.jQuery = window.$ = require('jquery');
var moment = require('moment');
var _ = require('lodash');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var iron = require('iron');
var views = require('./views/main.js');
var models = require('./models/models.js');

var resApp = new Marionette.Application();

resApp.addRegions({
	roomRegion: '#rooms',
	mainRegion: '#app'
});

var routerController = Marionette.Object.extend({
	start: function() {
		if(document.cookie) {
			Backbone.history.navigate('calendar/2', {trigger: true});
			return;
		}

		resApp.roomRegion.$el.hide();
		resApp.mainRegion.show(views.loginView, {preventDestroy: true});
	},

	register: function() {
		if(document.cookie) {
			Backbone.history.navigate('calendar/2', {trigger: true});
			return;
		}

		resApp.roomRegion.$el.hide();
		resApp.mainRegion.show(views.registerView, {preventDestroy: true});
	},

	calendar: function(roomId) {
		if(!document.cookie) {
			Backbone.history.navigate('', {trigger: true});
			return;
		}

		//resApp.mainRegion.empty({preventDestroy: true});

		views.calendarView.getRoomId(roomId);
		resApp.mainRegion.show(views.calendarView, {preventDestroy: true, forceShow: true});

		views.roomsView.getRoomId(roomId);
		resApp.roomRegion.$el.show();
		resApp.roomRegion.show(views.roomsView, {preventDestroy: true});
	},

	reservationDetails: function(id) {
		if(!document.cookie) {
			Backbone.history.navigate('', {trigger: true});
			return;
		}

		resApp.roomRegion.$el.hide();
		var model = new models.SingleReservation({id: id});

		model.fetch({success: function(model, response) {
			model.set({start: moment(model.get('start')).utc().format('DD.MM.YYYY. HH:mm')});
			model.set({end: moment(model.get('end')).utc().format('DD.MM.YYYY. HH:mm')});
			views.detailsView.getId(id);
			views.detailsView.getModel(model);
			resApp.mainRegion.show(views.detailsView, {preventDestroy: true});
		}});
	},

	confirmRegistration: function(id) {
		resApp.roomRegion.$el.hide();

		views.confirmRegistration.getId(id);
		resApp.mainRegion.show(views.confirmRegistration, {preventDestroy: true});
	}
});

var Router = Marionette.AppRouter.extend({
	controller: new routerController(),
	appRoutes: {
		'':'start',
		'register': 'register',
		'calendar/:roomId': 'calendar',
		'reservationDetails/:id': 'reservationDetails',
		'confirm/:id': 'confirmRegistration'
	}
});

$('document').ready(function() {
	resApp.on('start', function() {
		var router = new Router();

		Backbone.history.start();
	});

	resApp.start();
});
