'use strict';

var $ = require('jquery');
var _ = require('lodash');
var popsicle = require('popsicle');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var moment = require('moment');
var fullCalendar = require('fullcalendar');
var calendarTemplate = require('../../templates/calendar.hbs');
var q = require('q');
var noty = require('../lib/alert.js');
var format = require('string-template');

var EventView = Marionette.ItemView.extend({
  render: function() {
    var self = this;
    this.$el.unwrap();

    this.parent.getCalendar()
    .then(function calendarCatched($calendar) {
      self.showEvent($calendar);
    })
    .catch(function calendarError(error) {
      noty( error, 'error', 2500);
    });
  },

  showEvent: function($calendar) {
    var renderEventOptions = this.model.attributes;
    renderEventOptions.editable = false;

    if(this.model.get('userId') === this.parent.userIdLocalStorage) {
      renderEventOptions.editable = true;
    }

    $calendar.fullCalendar('renderEvent', this.model.attributes, true);

    this.$el.remove();
  }
  /*,

  destroy: function() {
    //remove full calendar element
  }*/
});

var CalendarView = Marionette.CompositeView.extend({
  childView: EventView,

  template: calendarTemplate,

  tagName: 'div',

  roomId: 0,

  calendarPromise: null,

  userIdLocalStorage: 0,

  ui: {
    $calendar: '#calendar',
    btnUserDetails: '#userDetailsRedirect',
    btnLogout: '#logout'
  },

  events: {
    'click @ui.btnUserDetails': 'userDetails',
    'click @ui.btnLogout': 'logout'
  },

  addEventSuccess: function(model, response) {
    //Preuzimam model iz baze samo zbog id-a
    this.collection.push(model.get('data'));

    noty(response.msg, 'success', 2500);
  },

  changeReservationStartAndEnd: function(changeEvent, revertFunc) {
    var self =this;

    var changes = {
      roomId: self.roomId,
      start: changeEvent._start._d,
      end: changeEvent._end._d
    };

    var reservation = this.collection.findWhere({id: changeEvent.id});

    reservation.save(changes, {
      wait: true,
      success: function(model, response) {
        noty(response.msg, 'success', 2500);
      },
      error: function(model, response) {
        noty('Unauthorized to change this event!', 'error', 2500);
        revertFunc();
      }
    });
  },

  select: function(start, end) {
    var self = this;
    if(moment(end._d).diff(start._d, 'minutes') > 180) {
      noty('Time limit on a single reservation is 3h!', 'error', 2500);
      $('#calendar').fullCalendar('unselect');
      return;
    }

    var title = prompt('Event Title:');
    var eventData;
    if (title) {
      eventData = {
        title: title,
        start: start,
        end: end,
        roomId: self.roomId
      };

      var newEvent = new self.collection.model(eventData);

      newEvent.save(null, {
        success: self.addEventSuccess.bind(self),
        error: function(model, response) {
          console.log(response);
        }
      });
    }
    $('#calendar').fullCalendar('unselect');
  },

  renderEvent: function(event, element) {
    if(event.userId !== this.userIdLocalStorage) {
      element.css('opacity', '0.55');
      element.css('border-style', 'none');
    }
  },

  clickEvent: function(clickEvent) {
    var userResDetLink = '';
    if(clickEvent.userId === this.userIdLocalStorage) {
      userResDetLink = format('userReservationDetails/{roomId}/{id}/{view}', {
        roomId: this.roomId,
        id: clickEvent.id,
        view: this.calendarView
      });

      Backbone.history.navigate(userResDetLink, {trigger: true});
      return;
    }

    userResDetLink = format('reservationDetails/{roomId}/{id}/{view}', {
      roomId: this.roomId,
      id: clickEvent.id,
      view: this.calendarView
    });

    Backbone.history.navigate(userResDetLink, {trigger:true});
  },

  initialize: function(options) {
    this.roomId = parseInt(options.roomId, 10);
    this.start = parseInt(options.start, 10);
    this.calendarView = options.calendarView;
    this.userIdLocalStorage = parseInt(window.localStorage.getItem('userId'), 10);

    this.calendarPromise = q.defer();
  },

  onBeforeAddChild: function(childView) {
    childView.parent = this;
  },

  getCalendar: function(calendarElement) {
    return this.calendarPromise.promise;
  },

  onDomRefresh: function() {
    this.createCalendar();
  },

  createCalendar: function() {
    var self = this;
    var $calendar = this.ui.$calendar;

    $calendar.fullCalendar({
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay'
      },

      defaultDate: self.start,
      defaultView: self.calendarView,
      firstDay: 1,
      allDaySlot: false,
      fixedWeekCount: false,
      selectOverlap: false,
      eventOverlap: false,
      slotLabelFormat: 'H:mm',
      selectable: true,
      selectHelper: true,
      timezone: 'UTC',

      select: self.select.bind(self),

      editable: true,
      eventLimit: true,

      eventRender: self.renderEvent.bind(self),

      eventClick: self.clickEvent.bind(self),

      eventResize: function(resizeEvent, delta, revertFunc) {
        self.changeReservationStartAndEnd(resizeEvent, revertFunc);
      },

      eventDrop: function(dragEvent, delta, revertFunc) {
        self.changeReservationStartAndEnd(dragEvent, revertFunc);
      },

      viewRender: function(view, element) {
        self.calendarView = view.type;
        self.start = moment($calendar.fullCalendar('getDate')).utc().valueOf();

        var calendarLink = format('calendar/{roomId}/{start}/{view}', {
          roomId: self.roomId,
          start: self.start,
          view: self.calendarView
        });

        Backbone.history.navigate(calendarLink, {trigger: true});
      }
    });

    this.calendarPromise.resolve($('#calendar'));
  },

  userDetails: function() {
    var userDetailsLink = format('userDetails/{roomId}/{start}/{view}', {
      roomId: this.roomId,
      start: this.start,
      view: this.calendarView
    });

    Backbone.history.navigate(userDetailsLink, {trigger: true});
  },

  logout: function() {
    popsicle.request({
      method: 'GET',
      url: 'logout'
    })
    .then(function loggedOut(res) {
      noty('Good bye!', 'success', 2500);
      Backbone.history.navigate('', {trigger: true});
    })
    .catch(function loggoutErr(err) {
      noty(err.body.msg, 'error', 2500);
    });
  }
});

module.exports = CalendarView;
