var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var bookmarkObj = {
    addCafe : function(reqData, callback) {
        var sql_insert_bookmark = 'INSERT bookmark(customer_id, cafe_id) ' +
                                  'VALUES(?, ?)';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_insert_bookmark, [reqData.customerId, reqData.cafeId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    },
    deleteCafe : function(reqData, callback) {
        var sql_delete_bookmark = 'DELETE FROM bookmark ' +
                                  'WHERE customer_id = ? AND cafe_id = ?';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_delete_bookmark, [reqData.customerId, reqData.cafeId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    }
};

module.exports = bookmarkObj;