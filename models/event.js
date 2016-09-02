var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var url = require('url');
var path = require('path');

var eventObj = {
    getEvents : function(callback) {
        var sql_get_events = 'SELECT a.cafe_id cafeId, a.image_name thumbnailUrl, b.image_name imageUrl ' +
            'FROM(SELECT id, cafe_id, type, image_name, start_date, end_date ' +
                 'FROM event ' +
                 'WHERE type = 0) a JOIN (SELECT id, cafe_id, type, image_name ' +
                                         'FROM event ' +
                                         'WHERE type = 1) b ON (a.cafe_id = b.cafe_id) ' +
            'WHERE a.start_date <= now() ' +
            'AND a.end_date >= now() ' +
            'ORDER BY rand() ' +
            'LIMIT 5';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_get_events, [], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    results[i].thumbnailUrl = url.resolve('https://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:4433', '/eventimages/' + path.basename(results[i].thumbnail));
                    results[i].imageUrl  = url.resolve('https://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:4433', '/eventimages/' + path.basename(results[i].image));
                }
                callback(null, results);
            });
        });
    }
};


module.exports = eventObj;