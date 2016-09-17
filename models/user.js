var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var UserObj = {
    findUser : function(userId, callback) {
        var sql_select_type = 'SELECT type FROM user WHERE id = ?';

        var sql_select_cafe = 'SELECT id, user_id userId, owner_login_id ownerLoginId, owner_name ownerName, owner_phone_number ownerPhoneNumber, owner_email ownerEmail, cafe_name cafeName, cafe_phone_number cafePhoneNumber, cafe_address cafeAddress, business_hour businessHour, auction_range auctionRange, y(location) latitude, x(location) longitude, wifi, days, parking, socket ' +
                              'FROM cafe ' +
                              'WHERE user_id = ?';

        var sql_select_customer = 'SELECT id, user_id userId, kakaoid, nickname, phone_number phoneNumber, auction_range auctionRange ' +
                                  'FROM customer ' +
                                  'WHERE user_id = ?';

        dbPool.logStatus();
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_type, [userId], function(err, results) {
               if (err) {
                   dbConn.release();
                   dbPool.logStatus();
                   return callback(err);
               }
               //고객일 경우
               if (results[0].type === 0) {
                   getCustomer(function(err, result) {
                       dbConn.release();
                       dbPool.logStatus();
                       if (err) {
                           return callback(err);
                       }
                       callback(null, result);
                   });
               // 점주일 경우
               } else {
                   getCafe(function(err, result) {
                       dbConn.release();
                       dbPool.logStatus();
                       if (err) {
                           return callback(err);
                       }
                       callback(null, result);
                   });
               }
            });

            function getCafe(callback) {
                dbConn.query(sql_select_cafe, [userId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0]);
                });
            }

            function getCustomer(callback) {
                dbConn.query(sql_select_customer, [userId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0]);
                });
            }
        });
    },
    getAuctionRange : function(reqData, callback) {
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
           if (reqData.kakaoid) {
               getCustomerAuctionRange(function(err, result) {
                   dbConn.release();
                   if (err) {
                       return callback(err);
                   }
                   callback(null, result);
               })
           } else {
                getCafeAuctionRange(function(err, result) {
                    dbConn.release();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, result);
                })
           }

           function getCafeAuctionRange(callback) {
               dbConn.query(sql_select_auction_range_from_cafe, [reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0].auctionRange)
               });
           }


           function getCustomerAuctionRange(callback) {
                dbConn.query(sql_select_auction_range_from_customer, [reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0].auctionRange);
                });
           }
        });
    },
    setAuctionRange : function(reqData, callback) {
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
            if (reqData.kakaoid) {
                setCustomerAuctionRange(function(err) {
                    dbConn.release();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                })
            } else {
                setCafeAuctionRange(function(err) {
                    dbConn.release();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                })
            }

            function setCafeAuctionRange(callback) {
                dbConn.query(sql_update_cafe_auction_range, [reqData.auctionRange, reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null)
                });
            }


            function setCustomerAuctionRange(callback) {
                dbConn.query(sql_update_customer_auction_range, [reqData.auctionRange, reqData.id], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }
        });
    },
};

module.exports = UserObj;
