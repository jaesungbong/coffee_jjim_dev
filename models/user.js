var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var UserObj = {
    findUser : function(id, callback) {
        var sql_find_user = 'SELECT id, type, reg_date, fcm_token ' +
                            'FROM user ' +
                            'WHERE id = ?';
        var sql_find_customer = 'SELECT * ' +
                                'FROM customer ' +
                                'WHERE user_id = ?';
        var sql_find_cafe = 'SELECT * ' +
                             'FROM cafe ' +
                             'WHERE user_id = ?';

        var user = {};

        dbPool.logStatus();
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_find_user, [id], function (err, result) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                if (result[0].type === 0) { //고객
                    findCustomer(function(err, customer) {
                        dbConn.release();
                        dbPool.logStatus();
                        if (err) {
                            return callback(err);
                        }
                        callback(null, customer);
                    });
                    callback(null, user);
                } else { //카페
                    findCafe(function(err, cafe) {
                        dbConn.release();
                        dbPool.logStatus();
                        if (err) {
                            return callback(err);
                        }
                        callback(null, cafe);
                    })
                }
            });

            function findCustomer(callback) {
                dbConn.query(sql_find_customer, [id], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    user.id = result[0].id;
                    user.userId = result[0].user_id;
                    user.kakaoId = result[0].kakaoid;
                    user.nickname = result[0].nickname;
                    user.phoneNumber = result[0].phone_number;
                    user.beepTime = result[0].beep_time;
                    user.auctionRange = result[0].auction_range;
                    user.auctionTime = result[0].auction_time;
                    callback(null, user);
                })
            }

            function findCafe(callback) {
                dbConn.query(sql_find_cafe, [id], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    user.id = result[0].id;
                    user.userId = result[0].user_id;
                    user.ownerLoginId = result[0].owner_login_id;
                    user.password = result[0].password;
                    user.ownerName = result[0].owner_name;
                    user.ownerPhoneNumber = result[0].owner_phone_number;
                    user.ownerEmail = result[0].owner_email;
                    user.cafeName = result[0].cafe_name;
                    user.cafePhoneNumber = result[0].cafe_phone_number;
                    user.cafeAddress = result[0].cafe_address;
                    user.businessHour = result[0].business_hour;
                    user.location = result[0].location;
                    user.auctionRange = result[0].auction_range;
                    user.wifi = result[0].wifi;
                    user.days = result[0].days;
                    user.parking = result[0].parking;
                    user.socket = result[0].socket;
                    callback(null, user);
                })
            }

        });
    },
    getAuctionRange : function(id, callback) {
        var sql_select_owner_login_id = 'SELECT owner_login_id ' +
                                        'FROM cafe ' +
                                        'WHERE id = ?';

        var sql_select_auction_range_from_cafe = 'SELECT auction_range auctionRange ' +
                                                 'FROM cafe ' +
                                                 'WHERE id = ?';

        var sql_select_auction_range_from_customer = 'SELECT auction_range auctionRange ' +
                                                     'FROM customer ' +
                                                     'WHERE id = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
           if (err) {
               return callback(err);
           }
           dbConn.query(sql_select_owner_login_id, [id], function(err, results) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                console.log(results);
                if(results[0].length !== 0) { //카페일 경우
                    getCafeAuctionRange(id, function(err, result) {
                        dbConn.release();
                        dbPool.logStatus();
                        if (err) {
                            return callback(err);
                        }
                        callback(null, result);
                    });
                } else { //고객일 경우
                    getCustomerAuctionRange(id, function(err, result) {
                        dbConn.release();
                        dbPool.logStatus();
                        if (err) {
                            return callback(err);
                        }
                        callback(null, result);
                    });
                }
           });

           function getCafeAuctionRange(id, callback) {
               dbConn.query(sql_select_auction_range_from_cafe, [id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0].auctionRange)
               });
           }


           function getCustomerAuctionRange(id, callback) {
                dbConn.query(sql_select_auction_range_from_customer, [id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0].auctionRange);
                });
           }
        });
    },
    setAuctionRange : function(reqData, callback) {
        var sql_select_owner_login_id = 'SELECT owner_login_id ' +
                                        'FROM cafe ' +
                                        'WHERE id = ?';

        var sql_update_cafe_auction_range = 'UPDATE cafe ' +
                                            'SET auction_range = ? ' +
                                            'WHERE id = ?';

        var sql_update_customer_auction_range = 'UPDATE customer ' +
                                               'SET auction_range = ? ' +
                                               'WHERE id = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_owner_login_id, [reqData.id], function(err, results) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                if(results[0].length !== 0) { //카페일 경우
                    setCafeAuctionRange(reqData, function(err, result) {
                        dbConn.release();
                        dbPool.logStatus();
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                } else { //고객일 경우
                    setCustomerAuctionRange(reqData, function(err, result) {
                        dbConn.release();
                        dbPool.logStatus();
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                }
            });

            function setCafeAuctionRange(reqData, callback) {
                dbConn.query(sql_update_cafe_auction_range, [reqData.auctionRange, reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null)
                });
            }


            function setCustomerAuctionRange(reqData, callback) {
                dbConn.query(sql_update_customer_auction_range, [reqData.auctionRange, reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }
        });
    },
    getCustomerFcmTokenByEstimateId : function(estimateId, callback) {
        var select_customer_fcm_token = 'SELECT u.fcm_token fcmToken ' +
                                        'FROM estimate e JOIN customer c ON (e.customer_id = c.id) ' +
                                        'JOIN user u ON (c.user_id = u.id) ' +
                                        'WHERE e.id = ?';
        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(select_customer_fcm_token, [estimateId], function(err, results) {
                dbConn.release();
                dbPool.logStatus();
                if (err) {
                    return callback(err);
                }
                callback(null, results[0].fcmToken);
            })
        })
    },
    getCafeFcmToken : function(cafeId, callback) {
        var select_cafe_fcm_token = 'SELECT fcm_token fcmToken' +
                                    'FROM cafe c JOIN user u ON (c.user_id = u.id) ' +
                                    'WHERE c.id = ?';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(select_cafe_fcm_token, [id], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results[0].fcmToken);
            })
        })
    }
};

module.exports = UserObj;
