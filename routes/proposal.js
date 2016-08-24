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

// 카페 예약하기
// 입찰서 테이블의 상태를 낙찰로 바꿈.
router.put('/:proposalId', isSecure, function(req, res, next) {
    var proposalId = req.params.proposalId;
    res.send({
        message : "예약 완료",
        reqData : proposalId
    })
});

module.exports = router;