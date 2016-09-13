var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Customer = require('../models/customer');
var logger = require('../config/logger');

//휴대폰 번호 등록
router.put('/me', isSecure, isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- enroll customer phone number --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = req.user.id;
    reqData.phoneNumber = req.body.phoneNumber || '010-1234-5678';
    Customer.setPhoneNumber(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : '휴대폰 번호 등록 완료'
        });
        logger.log('debug', '-------------- enroll customer phone number completed --------------');
    });
});

//고객관리
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- visited customer list --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.cafeId = req.user.id;
    reqData.pageNo = parseInt(req.query.pageNo || 1);
    reqData.rowCount = parseInt(req.query.rowCount || 10);
    Customer.getVisitedCustomer(reqData, function(err, results) {
        if (err) {
            return callback(err);
        }
        res.send({
            code : 1,
            message : '고객 관리 목록입니다.',
            result : results,
            currentPage : reqData.pageNo
        });
        logger.log('debug', '-------------- visited customer list completed --------------');
    });
});

module.exports = router;