var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;
var fs = require('fs');
var path = require('path');
var url = require('url');

var CafeObj = {
    findByOwnerLoginId : function(ownerLoginId, callback) {
        // 아이디에 따른 패스워드만 꺼내옴
        var sql_select_password = 'SELECT password ' +
                                  'FROM cafe ' +
                                  'WHERE owner_login_id = ?';

        // user 정보를 꺼내옴
        var sql_select_user = 'SELECT u.id id, type, reg_date regDate, u.fcm_token fcmToken ' +
                              'FROM user u JOIN cafe c ON (u.id = c.user_id) ' +
                              'WHERE c.owner_login_id = ?';

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_password, [ownerLoginId], function(err, password) {
                if (err) {
                    dbConn.release();
                    return callback(err);
                }
                if (password.length === 0) {
                    dbConn.release();
                    return callback(null);
                }
                dbConn.query(sql_select_user, [ownerLoginId], function(err, user) {
                    dbConn.release();
                    if (err) {
                       return callback(err);
                    }
                    if (user.length === 0) {
                       return callback(null);
                    }
                    //콜백으로 password 와 user 정보를 넘겨줌
                    callback(null, password[0].password, user[0]);
                });
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
    //fcm 토큰 UPDATE!!
    updateFcmToken : function(loginData, callback) {
        var sql_update_token = 'UPDATE user u JOIN cafe c ON(u.id = c.user_id) ' +
                               'SET u.fcm_token = ? ' +
                               'WHERE c.owner_login_id = ?';
        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_update_token, [loginData.fcmToken, loginData.ownerLoginId], function(err, result) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            })
        })
    },
    //카페 회원가입
    registerCafe : function(reqData, callback) {
        //user 테이블에 insert
        var sql_insert_user = 'INSERT INTO user(type, fcm_token) ' +
                              'VALUES(1, ?)'; //타입이 0이면 고객, 1이면 카페
        //cafe 테이블에 insert
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
                return callback(err);
            } else {
                dbConn.beginTransaction(function (err) {
                    if (err) {
                        dbConn.release();
                        return callback(err);
                    }
                    //waterfall인자로 insertId를 넘김
                    async.waterfall([insertUser, insertCafe],function(err, result) {
                        if (err) {
                            dbConn.rollback(function() {
                                dbConn.release();
                                callback(err);
                            });
                        }
                        dbConn.commit(function() {
                            dbConn.release();
                            callback(null);
                        });
                    });
                });
            }

            function insertUser(callback) {
                dbConn.query(sql_insert_user, [reqData.fcmToken], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    var userId = result.insertId;
                    callback(null, userId);
                });
            }

            function insertCafe(userId, callback) {
                dbConn.query(sql_insert_cafe, [userId,
                    reqData.ownerLoginId,
                    reqData.password,
                    reqData.ownerName,
                    reqData.ownerPhoneNumber,
                    reqData.ownerEmail,
                    reqData.cafeName,
                    reqData.cafePhoneNumber,
                    reqData.cafeAddress,
                    reqData.longitude,
                    reqData.latitude], function (err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                })
            }
        });
    },
    checkId : function(idToCheck, callback) {
        var sql_select_cafe = 'SELECT id ' +
                              'FROM cafe ' +
                              'WHERE owner_login_id = ?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_cafe, [idToCheck], function(err, result) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                if (result.length !== 0) {
                    return callback(null, 2, '사용 불가능');
                }
                callback(null, 1, '사용 가능');
            })
        })
    },
    editCafe : function(reqData, callback){
        var sql_select_cafe = 'SELECT cafe_address cafeAddress, business_hour businessHour, y(location) latitude, x(location) longitude, wifi, days, parking, socket ' +
                              'FROM cafe ' +
                              'WHERE id = ?';

        var sql_update_cafe = 'UPDATE cafe ' +
                              'SET cafe_address = ?, cafe_phone_number = ?, business_hour = ?, location = point(?, ?), wifi = ?, days = ?, parking = ?, socket = ? ' +
                              'WHERE id = ?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }

            async.waterfall([getCafeInfo, setCafeInfo], function(err) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });

            function getCafeInfo(callback) {
                dbConn.query(sql_select_cafe, [reqData.cafeId], function(err, results) {
                    if (err) {
                        return callback (err);
                    }
                    var cafeInfo = {};
                    cafeInfo.cafeAddress = reqData.cafeAddress || results[0].cafeAddress;
                    cafeInfo.cafePhoneNumber = reqData.cafePhoneNumber || results[0].cafePhoneNumber;
                    cafeInfo.businessHour = reqData.businessHour || results[0].businessHour;
                    cafeInfo.latitude = reqData.latitude ||results[0].latitude;
                    cafeInfo.longitude = reqData.longitude || results[0].longitude;
                    cafeInfo.wifi = reqData.wifi ||results[0].wifi;
                    cafeInfo.days = reqData.days || results[0].days;
                    cafeInfo.parking = reqData.parking || results[0].parking;
                    cafeInfo.socket = reqData.socket || results[0].socket;
                    callback(null, cafeInfo);
                });

            }

            function setCafeInfo(cafeInfo, callback) {
                dbConn.query(sql_update_cafe, [cafeInfo.cafeAddress, cafeInfo.cafePhoneNumber, cafeInfo.businessHour, cafeInfo.longitude, cafeInfo.latitude, cafeInfo.wifi, cafeInfo.days, cafeInfo.parking, cafeInfo.socket, reqData.cafeId], function(err, result) {
                    if (err) {
                        return callback (err);
                    }
                    callback(null);
                });
            }
        });
    },
    editOwner : function(reqData, callback) {
        var sql_select_owner = 'SELECT owner_name ownerName, password, owner_phone_number ownerPhoneNumber, owner_email ownerEmail ' +
                               'FROM cafe ' +
                               'WHERE id = ?';

        var sql_update_owner = 'UPDATE cafe ' +
                               'SET password = sha2( ? ,512), owner_name= ?, owner_phone_number = ?, owner_email = ?' +
                               'WHERE id = ?';

        dbPool.getConnection(function(err, dbConn) {
            if (err) {
                return callback(err);
            }

            async.waterfall([getOwnerInfo, setOwnerInfo], function(err) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });

            function getOwnerInfo(callback) {
                dbConn.query(sql_select_owner, [reqData.cafeId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    var ownerInfo = {};
                    ownerInfo.ownerName = reqData.ownerName || results[0].ownerName;
                    ownerInfo.password = reqData.password || results[0].password;
                    ownerInfo.ownerPhoneNumber = reqData.ownerPhoneNumber || results[0].ownerPhoneNumber;
                    ownerInfo.ownerEmail = reqData.ownerEmail || results[0].ownerEmail;
                    callback(null, ownerInfo);
                });
            }

            function setOwnerInfo(ownerInfo, callback) {
                dbConn.query(sql_update_owner, [ownerInfo.password, ownerInfo.ownerName, ownerInfo.ownerPhoneNumber, ownerInfo.ownerEmail, reqData.cafeId], function(err, result) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            }
        });
    },
    getCafeInfo : function(cafeId, callback) {
        // 이미지를 제외한 카페들의 정보를 가져오는 sql
        var sql_select_cafe = 'SELECT id id, cafe_name cafeName, cafe_address cafeAddress, cafe_phone_number cafePhoneNumber, business_hour businessHour, wifi, days, parking, socket, y(location) latitude, x(location) longitude ' +
                              'FROM cafe ' +
                              'WHERE id = ?';

        // 해당 카페의 이미지 id와 이미지 순서, 이미지 이름을 가져오는 sql
        var sql_select_image ='SELECT id imageId, sequence, image_name imageUrl ' +
                              'FROM image ' +
                              'WHERE cafe_id = ?';
        
        dbPool.getConnection(function(err, dbConn){
            if (err) {
                return callback(err);
            }
            async.waterfall([getCafeInfo, getCafeImage],
                function(err, cafeInfo, images){
                    if (err) {
                        dbConn.release();
                        return callback(err);
                    } else if (cafeInfo && !images) { //카페정보만 있고 이미지는 없을 경우
                        dbConn.release();
                        var cafeData = {};
                        cafeData.cafeInfo = cafeInfo;
                        callback(null, cafeData);
                    } else { //카페 정보와 이미지 둘다 있을 경우
                        dbConn.release();
                        var cafeData = {};
                        cafeData.cafeInfo = cafeInfo;
                        cafeData.images = images;
                        callback(null, cafeData);
                    }
            });

            //카페의 기본정보를 가져와 Callback으로 넘겨줌.
            function getCafeInfo(callback){
                dbConn.query(sql_select_cafe, [cafeId], function(err, results) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, results[0]);
                });
            }

            // getCafeInfo에서 받은 카페들의 기본정보를 인자로 받고
            // 이미지들을 가져와 이미지가 있으면 카페정보와 이미지를 함께 넘겨주고
            // 이미지가 없으면 카페 정보만 넘겨줌.
            function getCafeImage(cafeInfo, callback){
                dbConn.query(sql_select_image, [cafeId], function(err, images) {
                    if (err) {
                        return callback(err);
                    }
                    if (images.length !== 0) {
                        for(var i = 0; i < images.length; i++) {
                            images[i].imageUrl = url.resolve('http://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:8080', '/cafeimages/' + images[i].imageUrl);
                        }
                        callback(null, cafeInfo, images);
                    } else {
                        callback(cafeInfo);
                    }
                });
            }
        });
    },
    getAllCafe : function(reqData, callback) {
        //모든 카페 정보들과 각 카페의 대표 이미지를 거리순으로 뽑는 sql
        var sql_select_cafe = 'SELECT c.id id, c.cafe_name cafeName, c.cafe_address cafeAddress, c.wifi, c.days, c.parking, c.socket, y(location) latitude, x(location) longitude, i.image_name imageUrl, ' +
                                    'round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2) AS distance ' +
                              'FROM cafe c LEFT JOIN (SELECT * ' +
                                                     'FROM image ' +
                                                     'WHERE sequence = 1) i ON (c.id = i.cafe_id) ' +
                              'ORDER BY distance ' +
                              'LIMIT ?,?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_cafe, [reqData.latitude, reqData.longitude, reqData.latitude, reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
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
            })
        })
    },
    getKeyWordCafe : function(reqData, callback){
        //키워드로 검색된 카페 정보들과 각 카페의 대표 이미지를 거리순으로 뽑는 sql
        var sql_select_cafes = 'SELECT c.id id, c.cafe_name cafeName, c.cafe_address cafeAddress, c.wifi, c.days, c.parking, c.socket, y(location) latitude, x(location) longitude, i.image_name imageUrl, ' +
                                       'round(6371 * acos(cos(radians(?)) * cos(radians(y(location))) * cos(radians(x(location)) - radians(?)) + sin(radians(?)) * sin(radians(y(location)))), 2) AS distance ' +
                               'FROM cafe c LEFT JOIN (SELECT * ' +
                                                      'FROM image ' +
                                                      'WHERE sequence = 1) i ON (c.id = i.cafe_id) ' +
                               'WHERE c.cafe_address like ? OR c.cafe_name like ? ' +
                               'ORDER BY distance ' +
                               'LIMIT ?,?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_cafes, [reqData.latitude, reqData.longitude, reqData.latitude, '%'+ reqData.keyword +'%', '%'+ reqData.keyword +'%', reqData.rowCount * (reqData.pageNo - 1), reqData.rowCount], function(err, results) {
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
            })
        })
    },
    getBest5Cafe : function(callback) {
        var sql_select_best5_cafe = 'SELECT c.id id, i.image_name imageUrl ' +
                                    'FROM bookmark b JOIN cafe c ON (c.id = b.cafe_id) ' +
                                                    'JOIN image i ON (c.id = i.cafe_id) ' +
                                    'WHERE i.sequence = 1 ' +
                                    'GROUP BY b.cafe_id ' +
                                    'ORDER BY count(customer_id) DESC ' +
                                    'LIMIT 5';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_best5_cafe, [], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].imageUrl) {
                        results[i].imageUrl = url.resolve('http://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:8080', '/cafeimages/' + results[i].imageUrl);
                    }
                }
                callback(null, results);
            })
        })
    },
    getNewCafe : function(callback) {
        var sql_select_new_cafe = 'SELECT c.id id, i.image_name imageUrl ' +
                                  'FROM user u JOIN cafe c ON (u.id = c.user_id) ' +
                                              'JOIN image i ON (i.cafe_id = c.id) ' +
                                  'WHERE SUBDATE(now(), INTERVAL 30 DAY) < reg_date ' +
                                  'AND i.sequence = 1 ' +
                                  'ORDER BY RAND() ' +
                                  'LIMIT 5';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_new_cafe, [], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                for(var i = 0; i < results.length; i++){
                    if (results[i].imageUrl) {
                        results[i].imageUrl = url.resolve('http://ec2-52-78-110-229.ap-northeast-2.compute.amazonaws.com:8080', '/cafeimages/' + results[i].imageUrl);
                    }
                }
                callback(null, results);
            })
        })
    },
    getOwnerInfo : function(cafeId, callback) {
        var sql_select_owner_info = 'SELECT owner_name ownerName, owner_phone_number ownerPhoneNumber, owner_email ownerEmail ' +
                                    'FROM cafe ' +
                                    'WHERE id = ?';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_select_owner_info, [cafeId], function(err, results) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                callback(null, results[0]);
            })
        })
    }
};

module.exports = CafeObj;