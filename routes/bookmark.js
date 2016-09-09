var express = require('express');
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var Bookmark = require('../models/bookmark');
var logger = require('../config/logger');

//즐겨 찾기 카페 목록
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- bookmark cafe list --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        var reqData = {};
        reqData.customerId = 1;
        reqData.pageNo = parseInt(req.query.pageNo) || 1;
        reqData.rowCount = parseInt(req.query.rowCount) || 10;
        Bookmark.getBookmarkCafe(reqData, function(err, result) {
            res.send({
                message : "즐겨 찾기 카페 입니다.",
                data : result,
                currentPage: reqData.pageNo
            });
            logger.log('debug', '-------------- bookmark cafe list completed --------------');
        });
    }
});

// 즐겨찾기 추가
router.post('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- bookmark add --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = 1;
    reqData.id = req.body.id || 0;
    Bookmark.addCafe(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : "즐겨찾기 추가"
        });
        logger.log('debug', '-------------- bookmark add completed --------------');
    });
});

// 즐겨찾기 제거
router.delete('/:id', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- bookmark remove --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = 1;
    reqData.id = req.params.id;
    Bookmark.deleteCafe(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : "즐겨찾기 제거"
        });
        logger.log('debug', '-------------- bookmark remove completed --------------');
    });
});



module.exports = router;