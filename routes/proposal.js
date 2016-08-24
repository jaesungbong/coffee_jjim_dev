var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;

// 입찰한 카페 내역 확인
router.get('/', isSecure, function(req, res, next) {
    if(req.url.match(/\/?estimateId=\d+&pageNo=\d+&rowCount=\d+/i)){
        var estimateId = parseInt(req.query.estimateId);
        var pageNo = parseInt(req.query.pageNo);
        var rowCount = parseInt(req.query.rowCount);
        res.send({
            currentPage : pageNo,
            bidCafes : [
                {
                    proposalId : 1,
                    cafeId : 1,
                    cafeName : "coffe jjim",
                    cafeImageUrl : "http://host/../images/cafes/1.jpg",
                    cafeAddress : "서울시 강남구 역삼동",
                    distance : 700,
                    bidPrice : 12000
                }
            ],
        });
    }
});

// 예약 내역 보기
router.get('/done', isSecure, function(req, res, next) {
    var userType = 1;
    //고객용
    if(userType === 0){
        var pageNo = parseInt(req.query.pageNo);
        var rowCount = parseInt(req.query.rowCount);
        res.send({
            currentPage : pageNo,
            reservationCafes : [
                {
                    estimateId : 1,
                    reservationDateTime : "2016-05-15 16:08:14",
                    cafeName : "coffe jjim",
                    cafeAddress : "서울시 강남구 역삼동"
                }
            ],
        });
    }

    //점주용
    else if(userType === 1 ){
        var pageNo = parseInt(req.query.pageNo);
        var rowCount = parseInt(req.query.rowCount);
        res.send({
            currentPage : pageNo,
            reservationCafes : [
                {
                    reservationDateTime : 1,
                    customerNickName : "박재성",
                    people : 3 ,
                    bidPrice : 13000
                }
            ]
        });
    }
});

// 카페 예약하기
// 입찰서 테이블의 상태를 낙찰로 바꿈.
router.put('/:proposalId', isSecure, function(req, res, next) {
    var proposalId = req.params.proposalId;
    res.send({
        message : "예약 완료",
        reqData : proposalId
    })
});

//입찰하기
router.post('/', isSecure, function(req, res, next) {
    var reqData = {};
    reqData.estimateId = req.body.estimateId;
    reqData.bidPrice = req.body.bidPrice;
    res.send({
        proposalId: 1,
        message : "입찰 완료",
        reqData : reqData
    })
});

module.exports = router;