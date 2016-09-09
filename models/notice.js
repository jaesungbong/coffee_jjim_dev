var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var noticeObj = {
    getNotice : function(reqData, callback) {
        var sql_select_notice = 'SELECT title, contents, DATE_FORMAT((CONVERT_TZ(date, \'+00:00\', \'+09:00\')), \'%Y-%m-%d %H:%i:%s\') date ' +
                                'FROM notice ' +
                                'ORDER BY date DESC ' +
                                'LIMIT 0, 10';
        dbPool.logStatus();
        dbPool.getConnection(function(err,dbConn) {
            if (err) {
                return (err);
            }
            dbConn.query(sql_select_notice, [ reqData.rowCount * (reqData.pageNo - 1) , reqData.rowCount], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {

                   return callback(err);
                }
                callback(null, results);
            });
        });
    }
};

module.exports = noticeObj;