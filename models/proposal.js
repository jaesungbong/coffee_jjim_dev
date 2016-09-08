var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var Cafe = require('../models/cafe');
var User = require('../models/user');
var url = require('url');

var objProposal = {
    // 입찰하기
    doProposal : function(reqData, callback) {
        //자신의 카페에 견적서가 도착했는지 안했는지 검사
        var sql_select_delivery = 'SELECT * ' +
                                  'FROM delivery ' +
                                  'WHERE estimate_id = ? AND cafe_id = ?';
        
        // 자신이 그 견적서를 이미 입찰한 상태인지 아닌지 검사
        var sql_select_proposal = 'SELECT * ' +
                                  'FROM proposal ' +
                                  'WHERE estimate_id = ? AND cafe_id = ?';
        
        // 견적서를 입찰하기
        var sql_insert_proposal = 'INSERT INTO proposal(estimate_id, cafe_id, bid_price) ' +
                                  'VALUES(?, ?, ?)';
        var fcmData = {};

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            fcmData.bidPrice = reqData.bidPrice;

            async.series([checkDelivered, checkProposaled, setProposal, getProposalInfo], function (err, results) {
                dbConn.release();
                if (err) {
                        return callback(err);
                }
                callback(null, fcmData);
            });


            function checkDelivered(callback) {
                dbConn.query(sql_select_delivery, [reqData.estimateId, reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    } else if (results.length === 0) {
                        return callback(new Error('당신의 카페에는 견적서가 도착하지 않았습니다.'));
                    }
                    callback(null);
                });
            }

            function checkProposaled(callback) {
                dbConn.query(sql_select_proposal, [reqData.estimateId, reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    } else if (results.length !== 0) {
                        return callback(new Error('당신은 이미 견적서를 입찰한 상태 입니다.'));
                    }
                    callback(null);
                });
            }

            // 입찰 테이블에 insert!
            function setProposal(callback){
                dbConn.query(sql_insert_proposal, [reqData.estimateId, reqData.id, reqData.bidPrice], function(err, results) {
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
            Cafe.getCafeInfo(reqData.id, function(err, result) {
                if (err) {
                    return next(err);
                }
                fcmData.id = result.cafeInfo.id;
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
                                              'p.cafe_id id, ' +
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
                        results[i].imageUrl = url.resolve('http://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:8080', '/cafeimages/' + results[i].imageUrl);
                    } else {
                        results[i].imageUrl = - 1;
                    }
                }
                callback(null, results);
            });
        });
    },

    // 예약하기
    doReservation : function(reqData, callback) {
        // 낙찰카페 입찰서의 입찰 상태 바꾸기 placeHolder = proposalId
        var sql_update_bid_proposal_state = 'UPDATE proposal ' +
                                            'SET proposal_state = 1 ' +
                                            'WHERE id = ?';

        // 견적서 id 받아오기 placeHolder = proposalId
        var sql_select_estimate_id = 'SELECT estimate_id estimateId ' +
                                     'FROM proposal ' +
                                     'WHERE id = ?';

        // 견적서를 경매중에서 경매 종료로 바꾸기 placeHolder = estimateId
        var sql_update_estimate_state = 'UPDATE estimate ' +
                                        'SET auction_state = 1 ' +
                                        'WHERE id = ?';

        // 유찰 카페들의 입찰서 입찰 상태 바꾸기 placeHolder = estimateId
        var sql_update_no_bid_proposal_state = 'UPDATE proposal ' +
                                               'SET proposal_state = 2 ' +
                                               'WHERE estimate_id = ? AND proposal_state = 0';

        // 낙찰카페의 fcm 토큰 받아오기 placeHolder = estimateId
        var sql_select_bid_cafe_fcm_token = 'SELECT u.fcm_token bidCafeFcmToken ' +
                                            'FROM proposal p JOIN cafe c ON (p.cafe_id = c.id) ' +
                                                            'JOIN user u ON (u.id = c.user_id) ' +
                                            'WHERE p.proposal_state = 1 AND p.estimate_id = ?';

        // 유찰카페들의 fcm 토큰 받아오기 placeHolder = 견적서 ID
        var sql_select_no_bid_cafe_fcm_token = 'SELECT u.fcm_token noBidCafeFcmToken ' +
                                               'FROM proposal p JOIN cafe c ON (p.cafe_id = c.id) ' +
                                                               'JOIN user u ON (u.id = c.user_id) ' +
                                               'WHERE p.proposal_state = 2 AND p.estimate_id = ?';

        // 예약 정보 받아오기 placeHolder = proposalID, estimateID
        var sql_select_reservation_info = 'SELECT DATE_FORMAT(CONVERT_TZ(e.auction_start_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') auctionStartTime, DATE_FORMAT(CONVERT_TZ(e.reservation_time, \'+00:00\', \'+09:00\'), \'%Y-%m-%d %H:%i:%s\') reservationTime, e.people, e.wifi, e.days, e.parking, e.socket, c.nickname, c.phone_number phoneNumber, p.bid_price bidPrice ' +
                                          'FROM estimate e JOIN proposal p ON (e.id = p.estimate_id) ' +
                                                          'JOIN customer c ON (c.id = e.customer_id) ' +
                                          'WHERE estimate_id = ? AND p.id = ?';

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.beginTransaction(function(err) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                var resultData = {};
                async.series([doChangeBidProposalState, getEstimateId, setStateAndgetFcmTokenAndReservationInfo], function(err, results) {
                    if (err) {
                        dbConn.rollback(function() {
                            dbConn.release();
                            return callback(err);
                        })
                    }
                    dbConn.commit(function() {
                        dbConn.release();
                        callback(null, resultData);
                    })
                });

                function doChangeBidProposalState(callback) {
                    dbConn.query(sql_update_bid_proposal_state, [reqData.proposalId], function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    })
                }

                function getEstimateId(callback) {
                    dbConn.query(sql_select_estimate_id, [reqData.proposalId], function(err, results) {
                        if (err) {
                            return callback(err);
                        }
                        resultData.estimateId = results[0].estimateId;
                        callback(null);
                    })
                }

                function setStateAndgetFcmTokenAndReservationInfo(callback) {
                    async.parallel([
                        doChangeEstimateState,
                        doChangeNoBidProposalState,
                        getBidCafeFcmToken,
                        getNoBidCafeFcmToken,
                        getReservationInfo], function (err, results) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });

                    function doChangeEstimateState(callback) {
                        dbConn.query(sql_update_estimate_state, [resultData.estimateId], function(err, result) {
                            if (err) {
                                return callback(err)
                            }
                            callback(null);
                        });
                    }

                    function doChangeNoBidProposalState(callback) {
                        dbConn.query(sql_update_no_bid_proposal_state, [resultData.estimateId], function(err, result) {
                            if (err) {
                                return callback(err)
                            }
                            callback(null);
                        });
                    }

                    function getBidCafeFcmToken(callback) {
                        dbConn.query(sql_select_bid_cafe_fcm_token, [resultData.estimateId], function(err, results) {
                            if (err) {
                                return callback(err);
                            }
                            resultData.bidCafeFcmTokens = [];
                            resultData.bidCafeFcmTokens.push(results[0].bidCafeFcmToken);
                            callback(null);
                        });
                    }

                    function getNoBidCafeFcmToken(callback) {
                        dbConn.query(sql_select_no_bid_cafe_fcm_token, [resultData.estimateId], function(err, results) {
                            if (err) {
                                return callback(err);
                            }
                            resultData.noBidCafeFcmTokens = [];
                            for(var i = 0; i < results.length; i ++) {
                                resultData.noBidCafeFcmTokens.push(results[i].noBidCafeFcmToken);
                            }
                            callback(null);
                        });
                    }

                    function getReservationInfo(callback) {
                        dbConn.query(sql_select_reservation_info, [resultData.estimateId, reqData.proposalId], function(err, results) {
                            if (err) {
                                return callback(err);
                            }
                            resultData.reservationInfo = results[0];
                            callback(null);
                        });
                    }
                }
            });
        });
    }
};

module.exports = objProposal;