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
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        var reqData = {};
        reqData.customerId = req.user.id;
        reqData.pageNo = parseInt(req.query.pageNo) || 1;
        reqData.rowCount = parseInt(req.query.rowCount) || 10;
        Bookmark.getBookmarkCafe(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message : "즐겨 찾기 카페 입니다.",
                result : result,
                currentPage: reqData.pageNo
            });
            logger.log('debug', '-------------- bookmark cafe list completed --------------');
        });
    }
});
//즐겨찾기 상태 보기
router.get('/:cid', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- isBookmarked --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = req.user.id;
    reqData.cafeId = parseInt(req.params.cid);
    Bookmark.getIsBookMarked(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : result, // 1이면 등록한 상태, 2이면 등록하지 않은 상태
            message : "즐겨찾기 상태 입니다."
        });
        logger.log('debug', '-------------- isBookmarked completed --------------');
    });
});

// 즐겨찾기 추가
router.post('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- bookmark add --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = req.user.id;
    reqData.cafeId = parseInt(req.body.cafeId) || - 1;
    Bookmark.addCafe(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : "즐겨찾기 추가"
        });
        logger.log('debug', '-------------- bookmark add completed --------------');
    });
});

// 즐겨찾기 제거
router.delete('/:cid', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- bookmark remove --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = req.user.id;
    reqData.cafeId = parseInt(req.params.cid || 0);
    Bookmark.deleteCafe(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : "즐겨찾기 제거"
        });
        logger.log('debug', '-------------- bookmark remove completed --------------');
    });
});

module.exports = router;