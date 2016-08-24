var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;

// 즐겨찾기 조회
router.get('/', isSecure, function(req, res, next) {
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        res.send({
            bookMarkCafes: [{
                cafeId : 1,
                cafeName : "every cafe",
                cafeImageUrl : "http://host/../images/cafes/1.jpg",
                cafeAddress : "서울시 강남구 역삼동" ,
                distance : 800,
                options : { wifi : true, days : true, parking : true, socket : true }
            }],
            currentPage: 1
        });
    }
});

// 즐겨찾기 하기
router.post('/', isSecure, function(req, res, next) {
    var estimateId = req.body.estimateId;
    res.send({
        message : "즐겨찾기 완료"
    })
});

// 즐겨찾기 카페 삭제
router.delete('/:cafeId', isSecure, function(req, res, next) {
   var cafeId = req.params.cafeId;
    res.send({
        message : "제거 완료"
    });
});



module.exports = router;