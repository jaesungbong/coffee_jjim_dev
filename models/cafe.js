var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var CafeObj = {
    findByOwnerLoginId : function(ownerLoginId, callback) {
        var sql_select_cafe = 'SELECT id, user_id, owner_login_id, password, owner_name, owner_phone_number, owner_email, cafe_name, cafe_phone_number, cafe_address, weekday_business_hour, weekend_business_hour, latitude, longitude, auction_range, enrolled_date, menu_image, wifi, days, parking, socket FROM cafe ' +
            'WHERE owner_login_id = ? ';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_cafe, [ownerLoginId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                if (results.length === 0) {
                    return callback(null, null);
                }
                callback(null, results[0]);
            })
        });
    },
    verifyPassword : function(password, hashPassword, callback) {
        var sql = 'SELECT SHA2(?, 512) password';
        dbPool.getConnection(function(err, dbConn){
            if (err) {
                return callback(err);
            }
            dbConn.query(sql, [password], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                if (results[0].password !== hashPassword) {
                    return callback(null, false)
                }
                callback(null, true);
            });
        });
    },
    registerCafe : function(cafeData, callback) {
        var sql_insert_user = 'INSERT INTO user(type) ' +
                              'VALUES(1)';
        var sql_insert_cafe = 'INSERT INTO cafe(user_id, ' +
                                                'owner_login_id, ' +
                                                'password, ' +
                                                'owner_name, ' +
                                                'owner_phone_number, ' +
                                                'owner_email, ' +
                                                'cafe_name, ' +
                                                'cafe_phone_number, ' +
                                                'cafe_address, ' +
                                                'latitude, ' +
                                                'longitude) ' +
                              'VALUES(?, ?, SHA2(?, 512), ?, ?, ?, ?, ?, ?, ?, ?)';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            } else {
                dbConn.beginTransaction(function (err) {
                    if (err) {
                        dbConn.release();
                        return callback(err);
                    }
                    insertUser(function (err) {
                        if (err) {
                            return dbConn.rollback(function () {
                                dbConn.release();
                                callback(err);
                            })
                        }
                        dbConn.commit(function() {
                            dbConn.release();
                            callback(null);
                        })
                    })
                })
            }

            function insertUser(callback) {
                dbConn.query(sql_insert_user, [], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    var userId = result.insertId;
                    insertCafe( userId, function (err, result) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    })
                });
            }

            function insertCafe(userId, callback) {
                dbConn.query(sql_insert_cafe, [userId,
                                                cafeData.ownerLoginId,
                                                cafeData.password,
                                                cafeData.ownerName,
                                                cafeData.ownerPhoneNumber,
                                                cafeData.ownerEmail,
                                                cafeData.cafeName,
                                                cafeData.cafePhoneNumber,
                                                cafeData.cafeAddress,
                                                cafeData.latitude,
                                                cafeData.longitude], function (err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                })
            }
        });
    },
    checkId : function(ownerLoginId, callback) {
        var sql_select_cafe = 'SELECT id ' +
                              'FROM cafe ' +
                              'WHERE owner_login_id = ?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_cafe, [ownerLoginId], function(err, result) {
                console.log(result);
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                if (result.length !== 0){
                    return callback(null, false);
                }
                callback(null, true);
            })
        })
    }
};

module.exports = CafeObj;