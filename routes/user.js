var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var User = require('../models/user');

router.get('/me', isAuthenticated, function(req, res, next) {
    var id = req.user.id;
    User.getAuctionRange(id, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : "역경매 범위 입니다.",
            data : result
        });
    });
});

router.put('/me', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.id = req.user.id;
    reqData.auctionRange = parseInt(req.body.auctionRange || 1);
    User.setAuctionRange(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : "역경매 범위 변경 완료.",
        });
    });
});

module.exports = router;