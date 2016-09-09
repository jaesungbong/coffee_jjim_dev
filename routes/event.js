var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Event = require('../models/event');
var logger = require('../config/logger');

//이벤트 썸네일 보기
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- event --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    Event.getEvents(function (err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            message : '이벤트 이미지 입니다.',
            data : results
        });
        logger.log('debug', '-------------- event completed --------------');
    });
});

module.exports = router;