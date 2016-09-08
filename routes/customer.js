var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Customer = require('../models/customer');

//휴대폰 번호 등록
router.put('/me', isSecure, isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.customerId = 1;
    //reqData.customerId = req.user.id;
    reqData.phoneNumber = req.body.phoneNumber || '010-1234-5678';
    Customer.setPhoneNumber(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : '휴대폰 번호 등록 완료'
        });
    });
});

//고객관리
router.get('/', isAuthenticated, function(req, res, next) {
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
        })
    })
});

module.exports = router;