var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var estimateObj = {
    // 견적서 작성하기
    writeEstimate : function(estimateData, callback) {
        // 현재시각과 예약시각 비교하기
        var sql_select_time = 'SELECT NOW() < CONVERT_TZ(DATE_SUB(STR_TO_DATE(?, \'%Y-%m-%d %H:%i:%s\'), INTERVAL ? MINUTE), \'+00:00\', \'-09:00\') boolean';

        // 사용자가 현재 경매 중인지 아닌지
        var sql_select_check = 'SELECT id ' +
                               'FROM estimate ' +
                               'WHERE customer_id= ? AND auction_state = 0';

        // 견적서 작성하기
        var sql_insert_estimate = 'INSERT INTO estimate(customer_id, people, auction_time, reservation_time, wifi, days, parking, socket, location) ' +
                                  'VALUES (?, ?, ?, convert_tz(str_to_date(?, \'%Y-%m-%d %H:%i:%s\'), \'+00:00\',\'-09:00\'), ?, ?, ?, ?, point(?, ?))';


        // 견적서의 거리 조건에 맞는 카페 목록 조회
        var sql_select_cafe = 'SELECT c.id id, u.fcm_token fcmToken, wifi, days, parking, socket ' +
                              'FROM cafe c JOIN user u ON(c.user_id = u.id) ' +
                              'WHERE round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2) < (SELECT auction_range FROM customer WHERE id = ?) ' +
                              'AND auction_range > round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2)' ;

        // 견적서 전달
        var sql_insert_delivery = 'INSERT INTO delivery(estimate_id, cafe_id) ' +
                                  'VALUES(?, ?)';

        // 보내질 견적서 데이터
        var sql_select_fcm_token = 'SELECT fcm_token fcmToken ' +
                                   'FROM user u JOIN customer c ON (u.id = c.user_id) ' +
                                   'WHERE c.id = ?';

        dbPool.logStatus();
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }

            var resultData = {};

            dbConn.beginTransaction(function (err) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                async.series([compareTime, checkExistAuction, insertEstimate, selectDeliveryCafe, insertDelivery, getCustomerFcmToken], function(err, result) {
                    if (err) {
                        return dbConn.rollback(function() {
                            dbConn.release();
                            dbPool.logStatus();
                            callback(err);
                        })
                    }
                    dbConn.commit(function() {
                        dbConn.release();
                        dbPool.logStatus();
                        callback(null, resultData);
                    });
                });
            });
            //현재시각과 예약 시각 비교하기
            function compareTime(callback) {
                dbConn.query(sql_select_time, [estimateData.reservationTime, estimateData.auctionTime], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    if (results[0].boolean !== 1) {
                        return callback(new Error('경매 종료시각이 예약시간을 초과합니다.'));
                    }
                    callback(null);
                });
            }


            //진행중인 경매가 있는지 확인하기
            function checkExistAuction(callback) {
                dbConn.query(sql_select_check, [estimateData.customerId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    if (results.length !== 0) {
                        return callback(new Error('이미 진행중인 경매가 있습니다.'));
                    }
                    callback(null);
                })
            }
            //견적서 작성하기
            // customer_id, people, auction_time, reservation_time, wifi, days, parking, socket, longitude, latitude
            function insertEstimate(callback) {
                dbConn.query(sql_insert_estimate,
                    [estimateData.customerId,
                    estimateData.people,
                    estimateData.auctionTime,
                    estimateData.reservationTime,
                    estimateData.wifi,
                    estimateData.days,
                    estimateData.parking,
                    estimateData.socket,
                    estimateData.longitude,
                    estimateData.latitude], function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        resultData.estimateId = results.insertId;
                        callback(null);
                });
            }

            //견적서의 거리, 옵션 조건에 맞는 카페찾기
            function selectDeliveryCafe(callback) {
                var options = ((estimateData.wifi === 1) ? '1' : '0');
                options = options + ((estimateData.days === 1) ? '1' : '0');
                options = options + ((estimateData.parking === 1) ? '1' : '0');
                options = options + ((estimateData.socket === 1) ? '1' : '0');
                options = parseInt(options, 2);
                dbConn.query(sql_select_cafe,
                    [estimateData.latitude,
                    estimateData.longitude,
                    estimateData.latitude,
                    estimateData.customerId,
                    estimateData.latitude,
                    estimateData.longitude,
                    estimateData.latitude], function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        resultData.id =[];
                        resultData.cafeFcmToken = [];
                        if (results.length === 0) {
                            return callback(new Error('견적서의 거리에 맞는 카페를 찾지 못했습니다.')); //거리 때문에 전달X
                        }
                        for(var i = 0; i < results.length; i++) {
                            var resultsOptions = results[i].wifi.toString() + results[i].days.toString() + results[i].parking.toString() + results[i].socket.toString();
                            resultsOptions = parseInt(resultsOptions, 2);
                            if ((options & resultsOptions) === options ){
                                resultData.id.push(results[i].id);
                                resultData.cafeFcmToken.push(results[i].fcmToken);
                            }
                        }
                        if (resultData.id.length === 0) {
                            return callback(new Error('견적서의 옵션 조건에 맞는 카페를 찾지 못했습니다.')); //견적서 전달될 카페 존재X
                        }
                        callback(null);
                });
            }

            // 견적서 전달
            function insertDelivery(callback) {
                async.each(resultData.id, function(item, callback) {
                    dbConn.query(sql_insert_delivery, [resultData.estimateId, item], function(err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null);
                        }
                    })
                }, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
            }

            //견적서 정보 구하기
            function getCustomerFcmToken(callback) {
                dbConn.query(sql_select_fcm_token, [estimateData.customerId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    resultData.myToken = [];
                    resultData.myToken.push(results[0].fcmToken);
                    callback(null);
                });
            }
        });
    },
    //경매 종료
    endAuction : function(estimateId, callback){
        var sql_update_estimate_end = 'UPDATE estimate ' +
                                      'SET auction_state = 1 ' +
                                      'WHERE id = ?';
        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_update_estimate_end, [estimateId], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                callback(null, results.changedRows);
            })
        })
    },
    // 견적서 목록
    getEstimateList : function(reqData, callback) {
        var sql_estimate_list =
            'SELECT a.estimateId, a.nickname, a.auctionStartTime, a.deadlineTime, a.reservationTime, a.people, a.wifi, a.days, a.parking, a.socket, b.proposal_state proposalState ' +
            'FROM(SELECT cafe_id id, e.id estimateId, c.nickname nickname, DATE_FORMAT(CONVERT_TZ(e.auction_start_time,\'+00:00\',\'+09:00\'), \'%Y-%m-%d %H:%i:%s\') auctionStartTime, e.people, wifi, days, parking, socket, DATE_FORMAT(CONVERT_TZ(DATE_ADD(e.auction_start_time, INTERVAL (e.auction_time) MINUTE), \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') deadlineTime, DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') reservationTime ' +
                 'FROM delivery d JOIN estimate e ON(d.estimate_id = e.id) ' +
                                 'JOIN customer c ON(e.customer_id = c.id) ' +
                 'WHERE cafe_id = ? AND auction_state = 0) a LEFT JOIN (SELECT estimate_id, proposal_state ' +
                                                                       'FROM proposal ' +
                                                                       'WHERE cafe_id = ?) b ON (a.estimateId = b.estimate_id) ' +
            'WHERE b.proposal_state = 0 OR b.proposal_state IS NULL ' +
            'LIMIT ?, ?';
        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_estimate_list, [reqData.id, reqData.id, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i ++){
                    if(results[i].proposalState === null) {
                        results[i].proposalState = -1;
                    }
                }
                callback(null, results);
            });
        });
    },
    // 고객용 예약 현황
    getBookedEstimateForCustomer : function(reqData, callback) {
        var sql_select_booked_estimate =
            'SELECT DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') reservationTime, cf.cafe_name cafeName, cf.cafe_address cafeAddress, e.people, e.wifi, e.days, e.parking, e.socket, p.bid_price ' +
            'FROM estimate e JOIN customer c ON (e.customer_id = c.id) ' +
                            'JOIN proposal p ON (e.id = p.estimate_id) ' +
                            'JOIN cafe cf ON (cf.id = p.cafe_id) ' +
            'WHERE c.id = ? AND p.proposal_state = 1 AND year(DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\')) = ? AND month(DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\')) = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_booked_estimate, [reqData.customerId, reqData.year, reqData.month], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    },
    // 점주용 예약 현황
    getBookedEstimateForCafe : function(reqData, callback) {
        var sql_select_booked_estimate =
            'SELECT DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') reservationTime, c.nickname, c.phone_number phoneNumber, e.people, e.wifi, e.days, e.parking, e.socket, p.bid_price ' +
            'FROM estimate e JOIN customer c ON (e.customer_id = c.id) ' +
                            'JOIN proposal p ON (e.id = p.estimate_id) ' +
                            'JOIN cafe cf ON (cf.id = p.cafe_id) ' +
            'WHERE cf.id = ? AND p.proposal_state = 1 AND year(DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\')) = ? AND month(DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\')) = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_booked_estimate, [reqData.cafeId, reqData.year, reqData.month], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    },
    // 예약 견적서 보기
    getBookedEstimateInfo : function(reqData, callback) {
        var sql_select_booked_estimate_info = 'SELECT DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') reservationTime, e.people, e.wifi, e.days, e.parking, e.socket, c.nickname, c.phone_number phoneNumber, p.bid_price bidPrice ' +
                                              'FROM estimate e JOIN proposal p ON (e.id = p.estimate_id) ' +
                                                              'JOIN customer c ON (c.id = e.customer_id) ' +
                                              'WHERE estimate_id = ? AND p.id = ?';
        dbPool.getConnection(function(err, dbConn) {
           if (err) {
               return callback(err);
           }
           dbConn.query(sql_select_booked_estimate_info, [reqData.estimateId, reqData.proposalId], function(err, results) {
               dbConn.release();
               if (err) {
                   return callback(err);
               }
               callback(null, results[0]);
           });
        });
    }
};


module.exports = estimateObj;