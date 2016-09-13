var express = require('express');
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var Notice = require('../models/notice');
var logger = require('../config/logger');

// 공지사항
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- notice --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        var reqData = {};
        reqData.pageNo = parseInt(req.query.pageNo) || 1;
        reqData.rowCount = parseInt(req.query.rowCount) || 10;
        Notice.getNotice(reqData, function(err, result) {
           if (err) {
               return next(err);
           }
           res.send({
               code : 1,
               message : '공지사항 입니다.',
               result : result
           });
            logger.log('debug', '-------------- notice completed --------------');
        });
    }
});

module.exports = router;