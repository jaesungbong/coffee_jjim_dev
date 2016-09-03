var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var objProposal = {
    doProposal : function(reqData, callback) {
        var sql_insert_proposal = 'INSERT INTO proposal(estimate_id, cafe_id, bid_price) ' +
                                  'VALUES(?, ?, ?)';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_insert_proposal, [reqData.estimateId, reqData.cafeId, reqData.bidPrice], function(err, results) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            })
        })
    }
};

module.exports = objProposal;