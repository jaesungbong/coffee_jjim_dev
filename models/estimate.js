var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var estimateObj = {
    // 견적서 작성하기
    writeEstimate : function(estimateData, callback) {
        // 사용자가 현재 경매 중인지 아닌지
        var sql_select_check = 'SELECT id ' +
                               'FROM estimate ' +
                               'WHERE customer_id= ? AND auction_state = 0';

        // 견적서 작성하기
        var sql_insert_estimate = 'INSERT INTO estimate(customer_id, people, auction_time, reservation_time, wifi, days, parking, socket, location) ' +
            'VALUES (?, ?, ?, convert_tz(str_to_date(?, \'%Y-%m-%d %H:%i:%s\'), \'+00:00\',\'-09:00\'), ?, ?, ?, ?, point(?, ?))';


        // 견적서의 조건에 맞는 카페 목록 조회
        var sql_select_cafe = 'SELECT c.id cafeId, u.fcm_token fcmToken ' +
                              'FROM cafe c JOIN user u ON(c.user_id = u.id) ' +
                              'WHERE round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2) < (SELECT auction_range FROM customer WHERE id = ?) ' +
                              'AND auction_range > round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2)' ;

        // 견적서 전달
        var sql_insert_delivery = 'INSERT INTO delivery(estimate_id, cafe_id) ' +
                                  'VALUES(?, ?)';

        // 보내질 견적서 데이터
        var sql_select_estimate = 'SELECT a.estimateId, a.nickname, a.auctionStartTime, a.deadlineTime, a.reservationTime, a.people, a.wifi, a.days, a.parking, a.socket, b.proposal_state proposalState, a.fcmToken ' +
                                  'FROM(SELECT u.fcm_token fcmToken, e.id estimateId,c.nickname nickname, convert_tz(e.auction_start_time,\'+00:00\',\'+09:00\') auctionStartTime, e.people, wifi, days, parking, socket, convert_tz(date_add(e.auction_start_time, INTERVAL (e.auction_time) MINUTE), \'+00:00\', \'+09:00\') deadlineTime, convert_tz(e.reservation_time,\'+00:00\',\'+09:00\') reservationTime ' +
                                       'FROM estimate e JOIN customer c ON(e.customer_id = c.id) ' +
                                                       'JOIN user u ON(c.user_id = u.id) ' +
                                       'WHERE e.id = ?) a LEFT JOIN (SELECT estimate_id ,proposal_state ' +
                                                                    'FROM proposal ' +
                                  'WHERE proposal_state = 0 OR proposal_state IS NULL) b ON (a.estimateId = b.estimate_id)';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            var resultData = {};
            var cafeId = [];
            var fcmToken = [];

            dbConn.beginTransaction(function (err) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                async.series([checkExistAuction, insertEstimate, selectDeliveryCafe, insertDelivery, getEstimateData], function(err, result) {
                    if (err) {
                        return dbConn.rollback(function() {
                            dbConn.release();
                            callback(err);
                        })
                    }
                    dbConn.commit(function() {
                        dbConn.release();
                        callback(null, resultData);
                    });
                });
            });


            //진행중인 경매가 있는지 확인하기
            function checkExistAuction(callback) {
                dbConn.query(sql_select_check, [estimateData.customerId], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    if (result.length !== 0) {
                        return callback(new Error('당신은 이미 진행중인 경매가 있습니다.'));
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
                    estimateData.options.wifi,
                    estimateData.options.days,
                    estimateData.options.parking,
                    estimateData.options.socket,
                    estimateData.longitude,
                    estimateData.latitude], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        resultData.estimateId = result.insertId;
                        callback(null);
                });
            }

            //견적서 전달될 카페 찾기
            function selectDeliveryCafe(callback) {
                sql_select_cafe = sql_select_cafe + ((estimateData.options.wifi === 1) ? 'AND (wifi = ' + 1 + ') ' : '');
                sql_select_cafe = sql_select_cafe + ((estimateData.options.days === 1) ? 'AND (days = ' + 1 + ') ' : '');
                sql_select_cafe = sql_select_cafe + ((estimateData.options.parking === 1) ? 'AND (parking = ' + 1 + ') ' : '');
                sql_select_cafe = sql_select_cafe + ((estimateData.options.socket === 1) ? 'AND (socket = ' + 1 + ') ' : '');
                dbConn.query(sql_select_cafe,
                    [estimateData.latitude,
                    estimateData.longitude,
                    estimateData.latitude,
                    estimateData.customerId,
                    estimateData.latitude,
                    estimateData.longitude,
                    estimateData.latitude], function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        if (result.length !== 0) {
                            for(var i = 0; i < result.length; i++) {
                                cafeId[i] = result[i].cafeId;
                                if(result[i].fcmToken){
                                    fcmToken.push(result[i].fcmToken);
                                }
                            }
                            resultData.fcmToken = fcmToken;
                            return callback(null); //견적서 전달될 카페 존재
                        }
                        callback(new Error('견적서의 조건에 맞는 카페를 찾지 못했습니다.')); //견적서 전달될 카페 존재X
                });
            }

            // 견적서 전달
            function insertDelivery(callback) {
                async.each(cafeId, function(item, callback) {
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

            //경매 마감 시간 구하기
            function getEstimateData(callback) {
                dbConn.query(sql_select_estimate, [resultData.estimateId], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    resultData.estimateId = result[0].estimateId;
                    resultData.nickname = result[0].nickname;
                    resultData.auctionStartTime = result[0].auctionStartTime;
                    resultData.deadlineTime = result[0].deadlineTime;
                    resultData.reservationTime = result[0].reservationTime;
                    resultData.people = result[0].people;
                    resultData.wifi = result[0].wifi;
                    resultData.days = result[0].days;
                    resultData.parking = result[0].parking;
                    resultData.socket = result[0].socket;
                    resultData.proposalState = result[0].proposalState;
                    resultData.myToken = [];
                    resultData.myToken.push(result[0].fcmToken);
                    callback(null);
                });
            }
        });
    },
    endAuction : function(estimateId, callback){
        var sql_update_estimate_end = 'UPDATE estimate ' +
                                      'SET auction_state = 1 ' +
                                      'WHERE id = ?';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_update_estimate_end, function(err, result) {
                if (err) {
                    return callback(err);
                    dbConn.release();
                }
                callback(null);
            })
        })
    },
    getEstimateList : function(reqData, callback) {
        var sql_estimate_list = 'SELECT a.estimateId, a.nickname, a.auctionStartTime, a.deadlineTime, a.reservationTime, a.people, a.wifi, a.days, a.parking, a.socket, b.proposal_state proposalState ' +
                                'FROM(SELECT e.id estimateId,c.nickname nickname, convert_tz(e.auction_start_time,\'+00:00\',\'+09:00\') auctionStartTime, e.people, wifi, days, parking, socket, convert_tz(date_add(e.auction_start_time, INTERVAL (e.auction_time) MINUTE), \'+00:00\', \'+09:00\') deadlineTime, convert_tz(e.reservation_time, \'+00:00\', \'+09:00\') reservationTime ' +
                                     'FROM delivery d JOIN estimate e ON(d.estimate_id = e.id) ' +
                                                     'JOIN customer c ON(e.customer_id = c.id) ' +
                                     'WHERE cafe_id = ?) a LEFT JOIN (SELECT estimate_id ,proposal_state ' +
                                                                     'FROM proposal ' +
                                'WHERE proposal_state = 0 OR proposal_state IS NULL) b ON (a.estimateId = b.estimate_id) ' +
                                'LIMIT ?, ?';

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_estimate_list, [reqData.cafeId, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results);
            });
        });
    }
};


module.exports = estimateObj;