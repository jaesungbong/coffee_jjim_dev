var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var fs = require('fs');
var path = require('path');
var url = require('url');

var CafeObj = {
    findByOwnerLoginId : function(ownerLoginId, callback) {
        var sql_select_cafe = 'SELECT id, user_id, owner_login_id, password, owner_name, owner_phone_number, owner_email, cafe_name, cafe_phone_number, cafe_address, weekday_business_hour, weekend_business_hour, location, auction_range, wifi, days, parking, socket FROM cafe ' +
            'WHERE owner_login_id = ? ';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                dbConn.release();
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
                dbConn.release();
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
                                                'location) ' +
                              'VALUES(?, ?, SHA2(?, 512), ?, ?, ?, ?, ?, ?, point(?, ?))';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                dbConn.release();
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
                                                cafeData.longitude,
                                                cafeData.latitude], function (err, results) {
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
                dbConn.release();
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
    },
    editCafe : function(cafeData, callback){
        var sql_update_cafe = 'UPDATE cafe ' +
                          'SET cafe_address = ?, cafe_phone_number = ?, weekday_business_hour = ?, location = point(?, ?), wifi = ?, days = ?, parking = ?, socket = ? ' +
                          'WHERE id = ?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_update_cafe, [cafeData.cafeAddress, cafeData.cafePhoneNumber, cafeData.businessHour, cafeData.longitude, cafeData.latitude, cafeData.wifi, cafeData.days, cafeData.parking, cafeData.socket, cafeData.id], function(err,result) {
                dbConn.release();
                if (err) {
                    return callback (err);
                }
                callback(null);
            })
        })
    },
    editOwner : function(ownerData, callback) {
        var sql_update_owner = 'UPDATE cafe ' +
            'SET password = sha2( ? ,512), owner_name= ?, owner_phone_number = ?, owner_email = ?' +
            'WHERE id = ?';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_update_owner, [ownerData.password, ownerData.ownerName, ownerData.ownerPhoneNumber, ownerData.ownerEmail, ownerData.id], function(err,result) {
                dbConn.release();
                if (err) {
                    return callback (err);
                }
                callback(null);
            })
        })
    },
    insertOrEditImages : function(cafeId, imageFile, sequence, callback) {
        var sql_select_image = 'SELECT id, cafe_id, sequence, image_path ' +
                                'FROM image ' +
                                'WHERE cafe_id = ? AND sequence = ?';
        var sql_insert_image = 'INSERT INTO image(cafe_id, sequence, image_path) ' +
                                'VALUES(?, ?, ?)';
        var sql_select_imagepath = 'SELECT image_path ' +
                                   'FROM image ' +
                                   'WHERE cafe_id = ? AND sequence = ?';
        var sql_delete_image = 'DELETE FROM image ' +
                               'WHERE cafe_id = ? AND sequence = ?';

        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_select_image, [cafeId, sequence], function (err, results) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                //해당 이미지 파일이 없으므로 insert
                if (results.length !== 0) {
                    updateImage(function (err) {
                        dbConn.release();
                        if (err) {
                            return callback(err);
                        } else {
                            callback(null);
                        }
                    });
                } else { //해당 이미지 파일이 있으므로 update
                    insertImage(function (err) {
                        dbConn.release();
                        if (err) {
                            return callback(err);
                        } else {
                            callback(null);
                        }
                    });
                }
            });

            function insertImage(callback) {
                dbConn.query(sql_insert_image, [cafeId, sequence, imageFile.path], function(err,result) {
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
                                dbConn.release();
                            });
                        }
                        dbConn.commit(function () {
                            callback(null, result);
                            dbConn.release();
                        })
                    });
                })
            }

            function deleteImage(callback) {
                dbConn.query(sql_delete_image, [cafeId, sequence], function(err,result) {
                    if (err) {
                        return callback (err);
                    }
                    callback(null);
                })
            }

            function deleteRealImage(callback) {
                dbConn.query(sql_select_imagepath, [cafeId, sequence], function(err,result) {
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
        });
    },
    getCafeInfo : function(cafeId, callback) {
        var sql_select_cafe = 'SELECT cafe_name, cafe_address, cafe_phone_number, weekday_business_hour, wifi, days, parking, socket, y(location) latitude, x(location) longitude ' +
                              'FROM cafe ' +
                              'WHERE id = ?';
        var sql_select_image ='SELECT sequence, image_path ' +
                              'FROM image ' +
                              'WHERE cafe_id = ?';
        dbPool.getConnection(function(err, dbConn){
            if (err) {
                dbConn.release();
                return callback(err);
            }
            async.waterfall([getCafeInfo, getCafeImage],
                function(err, cafeInfo, images){
                    if (err) {
                        dbConn.release();
                        return callback(err);
                    } else if (cafeInfo && !images) {
                        dbConn.release();
                        var cafeData = {};
                        cafeData.cafeInfo = cafeInfo;
                        callback(null, cafeData);
                    } else {
                        dbConn.release();
                        var cafeData = {};
                        cafeData.cafeInfo = cafeInfo;
                        cafeData.images = images;
                        callback(null, cafeData);
                    }
            });

            function getCafeInfo(callback){
                dbConn.query(sql_select_cafe, [cafeId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0]);
                });
            }

            function getCafeImage(cafeInfo, callback){
                dbConn.query(sql_select_image, [cafeId], function(err, images) {
                    if (err) {
                        return callback(err);
                    }
                    if (images.length !== 0) {
                        for(var i = 0; i < images.length; i++) {
                            images[i].image_path = url.resolve('https://127.0.0.1:4433', '/cafeimages/' + path.basename(images[i].image_path));
                        }
                        callback(null, cafeInfo, images);
                    } else {
                        callback(cafeInfo);
                    }
                });
            }
        });
    },
    getAllCafe : function(pageNo, rowCount, latitude, longitude,callback) {
        var sql_select_cafe_by_latitude_longitude = 'SELECT c.id, c.cafe_name, c.cafe_address, c.wifi, c.days, c.parking, c.socket, y(location) latitude, x(location) longitude, i.image_path, ' +
                                                           'round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2) AS distance ' +
                                                    'FROM cafe c LEFT JOIN (SELECT * ' +
                                                                           'FROM image ' +
                                                                           'WHERE sequence = 1) i ON (c.id = i.cafe_id) ' +
                                                    'ORDER BY distance ' +
                                                    'LIMIT ?,?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_select_cafe_by_latitude_longitude, [latitude, longitude, latitude, rowCount * (pageNo - 1), rowCount], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].image_path) {
                            results[i].image_path = url.resolve('https://127.0.0.1:4433', '/cafeimages/' + path.basename(results[i].image_path));
                    }
                }
                callback(null, results);
            })
        })
    },
    getKeyWordCafe : function(keyword, pageNo, rowCount, latitude, longitude, callback){
        var sql_select_cafe_by_latitude_longitude = 'SELECT c.id, c.cafe_name, c.cafe_address, c.wifi, c.days, c.parking, c.socket, y(location) latitude, x(location) longitude, i.image_path, ' +
                                                           'round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2) AS distance ' +
                                                    'FROM cafe c LEFT JOIN (SELECT * ' +
                                                                           'FROM image ' +
                                                                           'WHERE sequence = 1) i ON (c.id = i.cafe_id) ' +
                                                    'WHERE c.cafe_address like ? ' +
                                                    'ORDER BY distance ' +
                                                    'LIMIT ?,?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_select_cafe_by_latitude_longitude, [latitude, longitude, latitude, '%'+ keyword +'%',rowCount * (pageNo - 1), rowCount], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].image_path) {
                        results[i].image_path = url.resolve('https://127.0.0.1:4433', '/cafeimages/' + path.basename(results[i].image_path));
                    }
                }
                callback(null, results);
            })
        })
    },
    getBest5Cafe : function(callback) {
        var sql_select_best5_cafe = 'SELECT c.id, count(customer_id), i.image_path ' +
                                    'FROM bookmark b JOIN cafe c ON (c.id = b.cafe_id) ' +
                                                    'JOIN image i ON (c.id = i.cafe_id) ' +
                                    'WHERE i.sequence = 1 ' +
                                    'GROUP BY b.cafe_id ' +
                                    'ORDER BY count(customer_id) DESC ' +
                                    'LIMIT 5';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                dbConn.release();
                return callback(err);
            }
            dbConn.query(sql_select_best5_cafe, [], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].image_path) {
                        results[i].image_path = url.resolve('https://127.0.0.1:4433', '/cafeimages/' + path.basename(results[i].image_path));
                    }
                }
                callback(null, results);
            })
        })
    }
};

module.exports = CafeObj;