var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var CustomerObj = {
    // 휴대폰 번호 등록하기
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
    },
    // 방문한 고객 보기
    getVisitedCustomer : function(reqData, callback) {
       var select_visited_customer = 'SELECT c.id customerId, c.nickname, count(*) visitTime, DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%m:%s\') reservationTime, e.people, e.wifi, e.days, e.parking, e.socket, p.bid_price bidPrice, b.cafe_id bookmark ' +
                                     'FROM customer c JOIN estimate e ON (c.id = e.customer_id) ' +
                                                     'JOIN proposal p ON (e.id = p.estimate_id) ' +
                                                     'JOIN cafe cf ON (p.cafe_id = cf.id) ' +
                                                     'LEFT JOIN (SELECT customer_id, cafe_id FROM bookmark b WHERE cafe_id = 36) b ON (b.customer_id = c.id) ' +
                                     'WHERE p.proposal_state = 1 AND cf.id = ? ' +
                                     'GROUP BY e.customer_id ' +
                                     'ORDER BY e.reservation_time DESC ' +
                                     'LIMIT ?, ?';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(select_visited_customer, [reqData.cafeId, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++) {
                    if (results[i].bookmark === null) {
                        results[i].bookmark = -1;
                    } else {
                        results[i].bookmark = 1;
                    }
                }
                callback(null, results);
            })
        });
    }
};

module.exports = CustomerObj;