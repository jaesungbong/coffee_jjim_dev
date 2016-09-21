var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
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

        var select_customer_fcm_token = 'SELECT u.fcm_token fcmToken ' +
                                        'FROM estimate e JOIN customer c ON (e.customer_id = c.id) ' +
                                                        'JOIN user u ON (c.user_id = u.id) ' +
                                        'WHERE e.id = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }

            var customerFcmToken = [];

            async.series([checkDelivered, checkProposaled, setProposal, getCustomerFcmToken], function (err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                        return callback(err);
                }
                callback(null, customerFcmToken);
            });
            function checkDelivered(callback) {
                dbConn.query(sql_select_delivery, [reqData.estimateId, reqData.cafeId], function(err, results) {
                    if (err) {
                        return callback(err);
                    } else if (results.length === 0) {
                        return callback(new Error('당신의 카페에는 견적서가 도착하지 않았습니다.'));
                    }
                    callback(null);
                });
            }
            function checkProposaled(callback) {
                dbConn.query(sql_select_proposal, [reqData.estimateId, reqData.cafeId], function(err, results) {
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
                dbConn.query(sql_insert_proposal, [reqData.estimateId, reqData.cafeId, reqData.bidPrice], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }
            // 고객의 fcm 토큰 받아오기
            function getCustomerFcmToken(callback) {
                dbConn.query(select_customer_fcm_token, [reqData.estimateId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    customerFcmToken.push(results[0].fcmToken);
                    callback(null);
                });
            }
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

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_proposal_list, [reqData.customerId, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].imageUrl) {
                        results[i].imageUrl = url.resolve('http://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com', '/cafeimages/' + results[i].imageUrl);
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

        // 유찰카페들의 fcm 토큰, 입찰서 ID 받아오기 placeHolder = 견적서 ID
        var sql_select_no_bid_cafe_fcm_token = 'SELECT p.id proposalId, u.fcm_token noBidCafeFcmToken ' +
                                               'FROM proposal p JOIN cafe c ON (p.cafe_id = c.id) ' +
                                               'JOIN user u ON (u.id = c.user_id) ' +
                                               'WHERE p.proposal_state = 2 AND p.estimate_id = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.beginTransaction(function(err) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                var resultData = {};
                async.series([doChangeBidProposalState, getEstimateId, setStateAndgetFcmTokenAndReservationInfo], function(err, results) {
                    if (err) {
                        dbConn.rollback(function() {
                            dbConn.release();
                            dbPool.logStatus();
                            return callback(err);
                        })
                    }
                    dbConn.commit(function() {
                        dbConn.release();
                        dbPool.logStatus();
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
                        getNoBidCafeFcmToken], function (err, results) {
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
                            resultData.noBidCafes = [];
                            for(var i = 0; i < results.length; i ++) {
                                var noBidCafe = {};
                                noBidCafe.fcmToken = results[i].noBidCafeFcmToken;
                                noBidCafe.proposalId = results[i].proposalId;
                                resultData.noBidCafes.push(noBidCafe);
                            }
                            callback(null);
                        });
                    }
                }
            });
        });
    }
};

module.exports = objProposal;