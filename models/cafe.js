var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var CafeObj = {
    findByOwnerLoginId : function(ownerLoginId, callback) {
        if (ownerLoginId !== "jaesungbong@gmail.com") {
            callback(null, null);
        } else {
            callback(null, {
                id: 1,
                name: "박재성",
                ownerLoginId: "jaesungbong@gmail.com",
                password: "33275a8aa48ea918bd53a9181aa975f15ab0d0645398f5918a006d08675c1cb27d5c645dbd084eee56e675e25ba4019f2ecea37ca9e2995b49fcb12c096a032e"
            });
        }
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
    }
};

module.exports = CafeObj;