var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Event = require('../models/event');

//이벤트 썸네일 보기
router.get('/', isAuthenticated, function(req, res, next) {
    Event.getEvents(function (err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            message : '이벤트 이미지 입니다.',
            data : results
        });
    });
});

module.exports = router;