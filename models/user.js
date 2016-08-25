var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var UserObj = {
    findUser : function(loginId, callback) {
        if (loginId === 1) {
            callback(null, {
                id: 1,
                name: "박재성",
                email: "jaesungbong@gamil.com"
            });
        } else {
            callback(null, {
                id: 2,
                name: "",
                email: "",
                facebookid: ""
            });
        }
    }
};

module.exports = UserObj;
