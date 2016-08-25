var mysql = require('mysql');
var async = require('async');
var dbPool = require('../models/common').dbPool;

var CustomerObj = {
    findOrCreate : function(profile, callback) {
        return callback(null, {
            id: 2,
            name: profile.displayName,
            email: profile.emails[0].value,
            facebookid: profile.id
        });
    }
};

module.exports = CustomerObj;