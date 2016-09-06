var express = require('express');
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var Notice = require('../models/notice');

router.get('/', isAuthenticated, function(req, res, next) {
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
               data : result
           })
        });
    }
});

module.exports = router;