var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var Cafe = require('../models/cafe');
var User = require('../models/user');
var url = require('url');

var objProposal = {
    // 입찰하기
    doProposal : function(reqData, callback) {
        var sql_insert_proposal = 'INSERT INTO proposal(estimate_id, cafe_id, bid_price) ' +
                                  'VALUES(?, ?, ?)';
        var fcmData = {};

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            fcmData.bidPrice = reqData.bidPrice;

            async.series([setProposal, getProposalInfo], function (err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, fcmData);
            });

            // 입찰 테이블에 insert!
            function setProposal(callback){
                dbConn.query(sql_insert_proposal, [reqData.estimateId, reqData.cafeId, reqData.bidPrice], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    fcmData.proposalId = results.insertId;
                    callback(null);
                });
            }
        });

        // 고객에게 보낼 입찰서의 정보를 parallel로 처리해 모두 가져온다.
        function getProposalInfo(callback) {
            async.parallel([getCustomerFcmToken, getCafeInfo, getDistance], function (err, results) {
                if (err) {
                    return next(err);
                }
                callback(null);
            });
        }

        // 고객의 fcm 토큰 받아오기
        function getCustomerFcmToken(callback) {
            User.getCustomerFcmTokenByEstimateId(reqData.estimateId, function(err, result) {
                if (err) {
                    return next(err);
                }
                fcmData.customerFcmToken = [];
                fcmData.customerFcmToken.push(result);
                callback(null);
            });
        }

        // 자신의 카페 정보 받아오기
        function getCafeInfo(callback) {
            Cafe.getCafeInfo(reqData.cafeId, function(err, result) {
                if (err) {
                    return next(err);
                }
                fcmData.cafeId = result.cafeInfo.cafeId;
                fcmData.cafeName = result.cafeInfo.cafeName;
                fcmData.cafeAddress = result.cafeInfo.cafeAddress;
                fcmData.wifi = result.cafeInfo.wifi;
                fcmData.days = result.cafeInfo.days;
                fcmData.parking = result.cafeInfo.parking;
                fcmData.socket = result.cafeInfo.socket;
                if (!result.images) {
                    fcmData.imageUrl = -1;
                } else {
                    fcmData.imageUrl = result.images[0].imageUrl;
                }
                callback(null);
            });
        }

        // 입찰서와 자기 카페의 거리 받아오기
        function getDistance(callback) {
            objProposal.getDistanceBetweenEstimateAndCafe(fcmData.proposalId, function(err, result) {
                if (err) {
                    return next(err);
                }
                fcmData.distance = result;
                callback(null);
            })
        }
    },

    // 입찰서와 카페의 거리
    getDistanceBetweenEstimateAndCafe : function(proposalId, callback) {
        var sql_select_distance = 'SELECT round(6371 * acos(cos(radians(y(e.location))) * cos(radians(y(c.location))) * cos(radians(x(c.location)) - radians(x(e.location))) + sin(radians(y(e.location))) * sin(radians(y(c.location)))), 2) AS distance ' +
            'FROM estimate e JOIN proposal p ON (e.id = p.estimate_id) ' +
            'JOIN cafe c ON (c.id = p.cafe_id) ' +
            'WHERE p.id = ?';

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_distance, [proposalId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results[0].distance);
            });
        });
    },

    // 입찰서 카페 목록
    getProposalList : function(reqData, callback) {
        var sql_select_proposal_list = 'SELECT p.id proposalId, ' +
                                              'p.cafe_id cafeId, ' +
                                              'c.cafe_name cafeName, ' +
                                              'i.image_name imageUrl, ' +
                                              'c.cafe_address cafeAddress, ' +
                                              'c.wifi wifi, ' +
                                              'c.days days, ' +
                                              'c.parking parking, ' +
                                              'c.socket socket, ' +
                                              'round(6371 * acos(cos(radians(y(e.location))) * cos(radians(y(c.location))) * cos(radians(x(c.location)) - radians(x(e.location))) + sin(radians(y(e.location))) * sin(radians(y(c.location)))), 2) AS distance, ' +
                                              'p.bid_price bidPrice ' +
                                        'FROM proposal p JOIN cafe c ON (p.cafe_id = c.id) ' +
                                                        'LEFT JOIN (SELECT image_name, cafe_id ' +
                                                                   'FROM image ' +
                                                                   'WHERE sequence = 1) i ON (c.id = i.cafe_id) ' +
                                                        'JOIN estimate e ON (e.id = p.estimate_id) ' +
                                        'WHERE estimate_id = (SELECT max(id) ' +
                                                             'FROM estimate ' +
                                                             'WHERE customer_id = ?) AND proposal_state = 0 ' +
                                        'LIMIT ?, ?';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_proposal_list, [reqData.customerId, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].imageUrl) {
                        results[i].imageUrl = url.resolve('https://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:4433', '/cafeimages/' + results[i].imageUrl);
                    } else {
                        results[i].imageUrl = - 1;
                    }
                }
                callback(null, results);
            })
        });
    },
    
    // 예약하기
    doReservation : function(reqData, callback) {
        var sql_update_bid_proposal_state = 'UPDATE proposal ' +
                                            'SET proposal_state = 1 ' +
                                            'WHERE id = ?';
        var sql_select_estimate_id = '';

        var sql_update_no_bid_proposal_state = 'UPDATE proposal ' +
                                               'SET proposal_state = 2 ' +
                                               'WHERE estimate_id = (SELECT e.eid FROM(SELECT estimate_id eid ' +
                                                                    'FROM proposal ' +
                                                                    'WHERE id = ?) e) AND proposal_state = 0';

        var sql_select_bid_cafe_fcm_token = 'SELECT u.fcm_token bidCafeFcmToken ' +
                                            'FROM proposal p JOIN cafe c ON (p.cafe_id = c.id) ' +
                                                            'JOIN user u ON (u.id = c.user_id) ' +
                                            'WHERE p.proposal_state = 1 AND p.estimate_id = (SELECT estimate_id eid ' +
                                                                                            'FROM proposal ' +
                                                                                            'WHERE id = ?)';

        var sql_select_no_bid_cafe_fcm_token = 'SELECT u.fcm_token noBidCafeFcmToken ' +
                                               'FROM proposal p JOIN cafe c ON (p.cafe_id = c.id) ' +
                                                               'JOIN user u ON (u.id = c.user_id) ' +
                                               'WHERE p.proposal_state = 2 AND p.estimate_id = (SELECT estimate_id eid ' +
                                                                                               'FROM proposal ' +
                                                                                               'WHERE id = ?)';
        var sql_select_reservation_info = '';

        // 낙찰카페 입찰서의 입찰 상태 바꾸기
        
        // 견적서 아이디 받아오기

        // 유찰 카페들의 입찰서 입찰 상태 바꾸기

        // 낙찰카페의 fcm 토큰 받아오기

        // 유찰카페들의 fcm 토큰 받아오기

        // 예약 정보 받아오기
    },
};

module.exports = objProposal;