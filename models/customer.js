var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var CustomerObj = {
    setPhoneNumber : function(reqData, callback) {
        var sql_update_phone_number = 'UPDATE customer ' +
                                      'SET phone_number = ? ' +
                                      'WHERE id = ?';
        dbPool.getConnection(function(err, dbConn) {
           if (err) {
               return callback(err);
           }
           dbConn.query(sql_update_phone_number, [reqData.phoneNumber, reqData.customerId], function(err, results) {
               dbConn.release();
               if (err) {
                   return callback(err);
               }
               callback(null);
           })
        });
    }
};

module.exports = CustomerObj;