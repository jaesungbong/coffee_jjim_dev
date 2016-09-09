var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var fs = require('fs');
var path = require('path');

var imageObj = {
    insertOrEditImages : function(cafeId, destImagePath, sequence, callback) {
        //이미지 이미지 파일이 존재하는지 검사하는 sql
        var sql_select_image = 'SELECT id, cafe_id, sequence, image_name, image_path ' +
            'FROM image ' +
            'WHERE cafe_id = ? AND sequence = ?';

        // 이미지 파일이 없을 때 INSERT하는 sql
        var sql_insert_image = 'INSERT INTO image(cafe_id, sequence, image_name,image_path) ' +
            'VALUES(?, ?, ?, ?)';

        // 이미지 파일 삭제를 위해 경로를 찾는 sql
        var sql_select_imagepath = 'SELECT image_path ' +
            'FROM image ' +
            'WHERE cafe_id = ? AND sequence = ?';

        // 이미지 파일을 삭제하고 DB에서 삭제하는 sql
        var sql_delete_image = 'DELETE FROM image ' +
            'WHERE cafe_id = ? AND sequence = ?';

        dbPool.logStatus();
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            // 이미지 파일이 있는지 없는지 검사
            dbConn.query(sql_select_image, [cafeId, sequence], function (err, results) {
                if (err) {
                    dbConn.release();
                    dbPool.logStatus();
                    return callback(err);
                }
                //해당 이미지 파일이 있으므로 update
                if (results.length !== 0) {
                    updateImage(function (err) {
                        if (err) {
                            dbConn.release();
                            dbPool.logStatus();
                            return callback(err);
                        } else {
                            dbConn.release();
                            dbPool.logStatus();
                            callback(null);
                        }
                    });
                } else { //해당 이미지 파일이 없으므로 insert
                    insertImage(function (err) {
                        if (err) {
                            dbConn.release();
                            dbPool.logStatus();
                            return callback(err);
                        } else {
                            dbConn.release();
                            dbPool.logStatus();
                            callback(null);
                        }
                    });
                }
            });

            function insertImage(callback) {
                dbConn.query(sql_insert_image, [cafeId, sequence, path.basename(destImagePath), destImagePath], function(err, result) {
                    if (err) {
                        return callback (err);
                    }
                    callback(null);
                })
            }

            function updateImage(callback) {
                dbConn.beginTransaction(function(err) {
                    if (err) {
                        return callback(err);
                    }
                    async.series([deleteRealImage, deleteImage, insertImage], function (err, result) {
                        if (err) {
                            return dbConn.rollback(function () {
                                callback(err);
                            });
                        }
                        dbConn.commit(function () {
                            callback(null, result);
                        })
                    });
                })
            }
            function deleteRealImage(callback) {
                dbConn.query(sql_select_imagepath, [cafeId, sequence], function(err, result) {
                    if (err) {
                        return callback (err);
                    }
                    fs.unlink(result[0].image_path, function (err) {
                        if (err) {
                            return callback(err);
                        }
                        callback(null);
                    });
                });
            }

            function deleteImage(callback) {
                dbConn.query(sql_delete_image, [cafeId, sequence], function(err, result) {
                    if (err) {
                        return callback (err);
                    }
                    callback(null);
                })
            }
        });
    }
};

module.exports = imageObj;
