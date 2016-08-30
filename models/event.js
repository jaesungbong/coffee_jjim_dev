var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var url = require('url');
var path = require('path');

var eventObj = {
    getEvents : function(callback) {
        var sql_get_events = 'SELECT a.cafe_id, a.image_path thumbnail, b.image_path image ' +
            'FROM(SELECT id, cafe_id, type, image_path, start_date, end_date ' +
            'FROM event ' +
            'WHERE type = 0) a JOIN (SELECT id, cafe_id, type, image_path ' +
            'FROM event ' +
            'WHERE type = 1) b ON (a.cafe_id = b.cafe_id) ' +
            'WHERE a.start_date <= now() ' +
            'AND a.end_date >= now() ' +
            'ORDER BY rand() ' +
            'LIMIT 5';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_get_events, [], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    results[i].thumbnail = url.resolve('https://127.0.0.1:4433', '/eventimages/' + path.basename(results[i].thumbnail));
                    results[i].image = url.resolve('https://127.0.0.1:4433', '/eventimages/' + path.basename(results[i].image));
                }
                callback(null, results);
            })
        })

    }
};


module.exports = eventObj;