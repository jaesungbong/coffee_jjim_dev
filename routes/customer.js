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


// 예약한 고객 정보 보기
router.get('/:customerId', isSecure, isAuthenticated, function(req, res, next) {
    var customerId = req.params.customerId;
    res.send({
        customerNickName : "userA",
        customerPhoneNumber : "010-8809-8943",
        numOfvist : 34,
        bookmark : true,
        visitData : {
        totalVisit : 10,
        data : { reservationDateTime : "2016-08-13 16:00:00",
            people : 3,
            options : { wifi : true, days : true, parking : true, socket : true },
            bidPrice : 3000}
        }
    })
});



module.exports = router;