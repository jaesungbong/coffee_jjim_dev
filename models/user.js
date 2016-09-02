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

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_find_user, [id], function (err, result) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                if (result[0].type === 0) { //고객
                    findCustomer(function(err, customer) {
                        dbConn.release();
                        if (err) {
                            return callback(err);
                        }
                        callback(null, customer);
                    });
                    callback(null, user);
                } else { //카페
                    findCafe(function(err, cafe) {
                        dbConn.release();
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
    }
};

module.exports = UserObj;
