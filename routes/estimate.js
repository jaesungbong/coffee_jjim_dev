var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;

// 고객이 견적 요청하기
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

module.exports = router;