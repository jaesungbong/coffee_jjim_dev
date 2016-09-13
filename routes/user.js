var express = require('express');
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var User = require('../models/user');
var logger = require('../config/logger');

// 역경매 허용 범위 보기
router.get('/me', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- get auction range --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = req.user;
    User.getAuctionRange(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : "역경매 범위 입니다.",
            result : result
        });
        logger.log('debug', '-------------- get auction range completed --------------');
    });
});

// 역경매 허용 범위 변경
router.put('/me', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- edit auction range --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = req.user;
    reqData.auctionRange = parseFloat(req.body.auctionRange || 1);
    User.setAuctionRange(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : "역경매 범위 변경 완료.",
        });
        logger.log('debug', '-------------- edit auction range completed --------------');
    });
});

module.exports = router;