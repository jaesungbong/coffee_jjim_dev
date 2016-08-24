var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;

// 고객용
// 경매 시작 시간 설정하기
router.post('/', isSecure, function(req, res, next) {
    console.log(req);
    var data={};
    data.people = req.body.people;
    data.latitude = req.body.latitude;
    data.longitude = req.body.longitude;
    data.reservationDateTime = req.body.reservationDateTime;
    data.options = req.body.options;
    data.auctionTime = req.body.auctionTime;
    res.send({
        estimateId : 1,
        reqData : data
    });
});

// 점주용
// 자신에게 들어온 견적 목록
router.get('/comed', isSecure, function(req, res, next) {
    if (req.query.pageNo && req.query.rowCount){
    res.send(
        { estimates : [
            {
                estimateId: 1,
                customerNickName: "userA",
                reservationDateTime: "2016-08-07 11:00:00",
                people: 3,
                options: {wifi: true, days: true, parking: false, soket: false},
                endDateTime: "2016-08-07 11:00:00"
            }, {
                estimateId: 1,
                customerNickName: "userA",
                reservationDateTime: "2016-08-07 11:00:00",
                people: 3,
                options: {wifi: true, days: true, parking: false, soket: false},
                endDateTime: "2016-08-07 11:00:00"
            }
        ]
        });
    }
});

// 고객용
// 특정 견적서 내용 보기
router.get('/:estimateId', isSecure, function(req, res, next) {
    var estimateId = req.params.estimateId;
    res.send({
        auctionStartDateTime : "2016-05-04",
        cafeAddress : "서울시 강남구",
        reservationDateTime : "2018-05-05 12:00:00",
        people : 3,
        options : { wifi : true, days : true, parking : false, soket : false },
        auctionTime : 20
    });
});




module.exports = router;