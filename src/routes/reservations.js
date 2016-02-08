'use strict';

var _ = require('lodash');
var User = require('../models/models.js').User;
var Room = require('../models/models.js').Room;
var Reservation = require('../models/models.js').Reservation;
var moment = require('moment');
var success;

function getAllReservations(req, res) {
	var resData = {};
	resData.success = false;

	Reservation.fetchAll()
	.then(function gotAllReservations(reservations) {
		if(!reservations) {
			resData.msg = 'No reservations found';
			res(resData);
			return;
		}

		resData.msg = 'Reservations found!';
		resData.success = true;
		resData.data = reservations;

		res(resData);
	})
	.catch(function setError(err) {
		resData = {};
		resData.success = false;
		resData.msg = err;

		res(resData);
	});
}

/*
var resData = {};
	resData.success = false;

	var roomIdArray = [];

	Room.fetchAll()
	.then(function roomsFetched(rooms) {
		var reservationsArray = [];

		_.map(rooms.models, function(room) {
			Reservation.where({roomId: room.attributes.roomId}).fetchAll()
			.then(function roomReservationFetched(reservations) {
				//reservationsArray.push(reservations);
				return reservations;
			})
			.catch(function(err) {
				resData.success = false;
				resData.msg = err.message;

				res(resData);
			});
		});

		res(reservationsArray);
	})
	.catch(function setError(err) {
		resData.success = false;
		resData.msg = err;

		res(resData);
	});
 */








function getRoomReservations(req, res) {
	var getReservations = {roomId: req.params.roomId};
	var resData = {};
	resData.success = false;

	Reservation.where(getReservations).fetchAll()
	.then(function gotRoomReservations(reservations) {
		if(!reservations) {
			resData.msg = 'No reservations found';
			res(resData);
			return;
		}

		resData.msg = 'Reservations found!';
		resData.success = true;
		resData.data = reservations;

		res(resData);
	})
	.catch(function setError(err) {
		resData = {};
		resData.success = false;
		resData.msg = err;

		res(resData);
	});
}

function createReservation(req, res) {
	var makeReservation = {
		userId: parseInt(req.auth.credentials, 10),
		roomId: req.params.roomId,
		title: req.payload.title,
		start: req.payload.start,
		end: req.payload.end
	};

	var resData = {};
	resData.success = false;

	var duration = moment(req.payload.end).diff(req.payload.start, 'minutes');
	if(duration > 180) {
		resData.msg = 'Maximum duration is 3h! You exceeded that time!';
		res(resData);
		return;
	}

	Reservation.fetchAll()
	.then(function overlapValidationAdd(reservations) {
		var success = true;
		_.map(reservations.models, function(reservation) {
			if(parseInt(req.params.roomId, 10) === reservation.attributes.roomId) {
				if(moment(req.payload.start).diff(reservation.attributes.end, 'minutes') < 0) {
					if(moment(req.payload.end).diff(reservation.attributes.start, 'minutes') > 0) {
						success = false;
					}
				}
			}
		});

		if(!success) {
			resData.msg = 'Your reservation overlaps with another one';
			res(resData);
			return;
		}

		var reservation = new Reservation(makeReservation);

		reservation.save()
		.then(function reservationCreated(reservation) {
			if(!reservation) {
				resData.msg = 'Failed to save reservation!';
				res(resData);
				return;
			}

			resData.msg = 'Reservation saved!';
			resData.success = true;
			resData.data = reservation;

			res(resData);
		})
		.catch(function setError(err) {
			resData = {};
			resData.success = false;
			resData.msg = err;

			res(resData);
		});
	});
	/**/
}

function changeDuration(req, response) {
	var resData = {};
	resData.success = false;

	if(!req.payload.start || !req.payload.end) {
		resData.msg = 'Start and end times are required!';
		response(resData);
		return;
	}

	var duration = moment(req.payload.end).diff(req.payload.start, 'minutes');
	if(duration > 180) {
		resData.msg = 'Maximum duration is 3h! You exceeded that time!';
		response(resData);
		return;
	}
	
	Reservation.fetchAll()
	.then(function overlapValidateChange(reservations) {
		var success = true;
		_.map(reservations.models, function(reservation) {
			if(parseInt(req.params.roomId, 10) === reservation.attributes.roomId) {
				if(reservation.attributes.id !== parseInt(req.params.id, 10)) {
					if(moment(req.payload.start).diff(reservation.attributes.end, 'minutes') < 0) {
						if(moment(req.payload.end).diff(reservation.attributes.start, 'minutes') > 0) {
							success = false;
						}
					}
				}
			}
		});

		if(!success) {
			resData.msg = 'Your reservation overlaps with another one';
			response(resData);
			return;
		}

		User.where({id: req.auth.credentials}).fetch()
		.then(function userChecked(user) {
			if(!user) {
				resData.msg = 'User not found!';
				response(resData);
				return;
			}

			var getReservation = {
				id: parseInt(req.params.id, 10),
				userId: parseInt(req.auth.credentials, 10)
			};

			if(user.attributes.username === 'admin') {
				getReservation = {id: parseInt(req.params.id, 10)};
			}

			var setReservation = {
				start: req.payload.start,
				end: req.payload.end
			};

			Reservation.where(getReservation).save(setReservation, {method: 'update'})
			.then(function reservationSet(res) {
				if(!res) {
					resData.msg = 'Your reservation not found!';
					response(resData);
					return;
				}
				
				resData.msg = 'Reservation updated!';
				resData.success = true;
				resData.data = res;

				response(resData);
				return;
			})
			.catch(function setError(err) {
				resData = {};
				resData.success = false;
				resData.msg = err.message;

				response(resData);
			});
		})
		.catch(function(err) {
			resData = {};
			resData.success = false;
			resData.msg = err.message;

			response(resData);
		});
	});
}

function deleteReservation(req, res) {
	var resData = {};
	resData.success = false;

	var getReservation = {
		id: parseInt(req.params.id, 10),
		userId: parseInt(req.auth.credentials, 10)
	};

	Reservation.where(getReservation).destroy()
	.then(function(response) {
		resData.msg = 'Reservation deleted!';
		resData.success = true;

		res(resData);
	})
	.catch(function(err){
		resData.msg = 'Not authorized!';
		res(resData);
	});
}

function updateTitle(req, response) {
	var resData = {};
	resData.success = false;

	if(!req.payload.newTitle) {
		resData.msg = 'Movie title required!';

		response(resData);
		return;
	}

	var getReservation = {
		id: req.params.id,
		userId: req.auth.credentials
	};

	var setReservation = {
		title: req.payload.newTitle
	};

	Reservation.where(getReservation).save(setReservation, {method: 'update'})
	.then(function reservationSet(res) {
		if(!res) {
			resData.msg = 'Reservation not found!';
			response(resData);
			return;
		}

		resData.msg = 'Reservation updated!';
		resData.success = true;
		resData.data = res;

		response(resData);
		return;
	})
	.catch(function setError(err) {
		resData = {};
		resData.success = false;
		resData.msg = err.message;

		response(resData);
	});
}

function getSingleReservation(req, res) {
	var resData = {};
	resData.success = false;

	Reservation.where({id: req.params.id}).fetch()
	.then(function gotAllReservations(reservations) {
		if(!reservations) {
			resData.msg = 'No reservations found';
			res(resData);
			return;
		}

		resData.msg = 'Reservation found!';
		resData.success = true;
		resData.data = reservations;

		res(resData);
	})
	.catch(function setError(err) {
		resData = {};
		resData.success = false;
		resData.msg = err;

		res(resData);
	});
}

module.exports = function(server) {
	server.route({
		method: 'GET',
		path: '/reservations',
		handler: getAllReservations
	});

	server.route({
		method: 'GET',
		path: '/reservations/rooms/{roomId}',
		handler: getRoomReservations
	});

	server.route({
		method: 'POST',
		path: '/reservations/{id}',
		handler: updateTitle
	});

	server.route({
		method: 'PUT',
		path: '/reservations/{id}',
		handler: changeDuration
	});

	server.route({
		method: 'DELETE',
		path: '/reservations/{id}',
		handler: deleteReservation
	});

	server.route({
		method: 'POST',
		path: '/rooms/{roomId}',
		handler: createReservation
	});

	server.route({
		method: 'GET',
		path: '/reservations/{id}',
		handler: getSingleReservation
	});
};
