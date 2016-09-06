var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var url = require('url');

var bookmarkObj = {
    getBookmarkCafe : function(reqData, callback) {
        // 이미지가 있는카페 없는카페 모두 가져옴.
        var sql_select_favorite_cafe = 'SELECT c.id cafeId, c.cafe_name cafeName, c.cafe_address cafeAddress, i.image_name imageUrl, c.wifi, c.days, c.parking, c.socket ' +
            'FROM cafe c JOIN bookmark b ON(c.id = b.cafe_id) ' +
            'LEFT JOIN (SELECT * FROM image WHERE sequence = 1) i ON(c.id = i.cafe_id) ' +
            'WHERE b.customer_id = ? ' +
            'LIMIT ?, ?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_favorite_cafe, [reqData.customerId, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].imageUrl) {
                        results[i].imageUrl = url.resolve('https://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:4433', '/cafeimages/' + results[i].imageUrl);
                    }
                }
                callback(null, results);
            })
        })
    },
    addCafe : function(reqData, callback) {
        var sql_insert_bookmark = 'INSERT bookmark(customer_id, cafe_id) ' +
                                  'VALUES(?, ?)';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_insert_bookmark, [reqData.customerId, reqData.cafeId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    },
    deleteCafe : function(reqData, callback) {
        var sql_delete_bookmark = 'DELETE FROM bookmark ' +
                                  'WHERE customer_id = ? AND cafe_id = ?';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_delete_bookmark, [reqData.customerId, reqData.cafeId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    }
};

module.exports = bookmarkObj;