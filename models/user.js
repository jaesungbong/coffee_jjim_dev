var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var UserObj = {
    findUser : function(id, callback) {
        var sql_find_user = 'SELECT u.type ,' +
                         'c.id, ' +
                         'c.user_id, ' +
                         'c.owner_login_id, ' +
                         'c.password, ' +
                         'c.owner_name, ' +
                         'c.owner_phone_number, ' +
                         'c.owner_email, ' +
                         'c.cafe_name, ' +
                         'c.cafe_phone_number, ' +
                         'c.cafe_address, ' +
                         'c.weekday_business_hour, ' +
                         'c.weekend_business_hour, ' +
                         'c.location, ' +
                         'c.auction_range, ' +
                         'c.enrolled_date, ' +
                         'c.menu_image, ' +
                         'c.wifi, ' +
                         'c.days, ' +
                         'c.parking, ' +
                         'c.socket ' +
                    'FROM cafe c JOIN user u ON(c.user_id = u.id) ' +
                    'WHERE c.id = ? ';
        dbPool.getConnection(function (err, dbConn) {
            if (err) {
                return callback(err);
            }
            dbConn.query(sql_find_user, [id], function (err, result) {
                dbConn.release();
                if (err) {
                    return callback(err);
                }
                console.log(result[0]);
                if (result[0].type === 0) { //고객
                    // var user = {};
                    // user.id = result[0].id;
                    // user.name = result[0].name;
                    // user.email = result[0].email;
                    // user.facebookid = result[0].facebookid;
                    callback(null, user);
                } else { //점주
                    var user = {};
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
                    user.weekdayBusinessHour = result[0].weekday_business_hour;
                    user.weekendBusinessHour = result[0].weekend_business_hour;
                    user.location = result[0].location;
                    user.auctionRange = result[0].auction_range;
                    user.enrolled_date = result[0].enrolled_date;
                    user.menuImage = result[0].menu_image;
                    user.wifi = result[0].wifi;
                    user.days = result[0].days;
                    user.parking = result[0].parking;
                    user.socket = result[0].socket;
                    callback(null, user);
                }
            });
        });
    }
};

module.exports = UserObj;
