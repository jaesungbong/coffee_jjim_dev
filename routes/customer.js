var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;

//휴대폰 번호 등록
router.put('/', isSecure, function(req, res, next) {
    var customerPhoneNumber = req.body.customerPhoneNumber;
    res.send({
        customerPhoneNumber : customerPhoneNumber
    })
});


// 예약한 고객 정보 보기
router.get('/:customerId', isSecure, function(req, res, next) {
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