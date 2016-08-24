var express = require('express');
var url = require('url');
var router = express.Router();
var isSecure = require('./common').isSecure;

// 모든 카페 보기
router.get('/', isSecure, function(req, res, next) {
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+&latitude=\d+&longitude=\d+/i)) {
        var pageNo = parseInt(req.query.pageNo);
        var rowCount = parseInt(req.query.rowCount);
        var latitude = parseInt(req.query.latitude);
        var longitude = parseInt(req.query.longitude);

        res.send({
            currentPage : 1,
            cafes : [{
                cafeId : 1,
                cafeName : "MY COFFEE",
                cafeAddress : "서울시 강남구 역삼동",
                cafeImageUrl : "http://host/../uploads/images/cafes/1.jpg",
                distance : 500,
                options : { wifi : true, days : true, parking : true, socket : true },
                latitude : "37.15646",
                longitude : "127.51646"
            }]
        });
    }
});

// 베스트 카페 목록5개 조회, GET /cafes/best5
router.get('/best5', isSecure, function(req, res, next) {
    res.send([
        { cafeId : 1, cafeImageUrl : "https://127.0.0.1/../images/cafes/2.jpg"},
        { cafeId : 2, cafeImageUrl : "https://127.0.0.1/../images/cafes/2.jpg"},
        { cafeId : 3, cafeImageUrl : "https://127.0.0.1/../images/cafes/3.jpg"},
        { cafeId : 4, cafeImageUrl : "https://127.0.0.1/../images/cafes/4.jpg"},
        { cafeId : 5, cafeImageUrl : "https://127.0.0.1/../images/cafes/5.jpg"},
    ]);
});

// 새로운 카페 목록 5개 조회, GET /cafes/new5
router.get('/new5', isSecure, function(req, res, next) {
    res.send([
        { cafeId : 1, cafeImageUrl : "https://127.0.0.1/../images/cafes/2.jpg"},
        { cafeId : 2, cafeImageUrl : "https://127.0.0.1/../images/cafes/2.jpg"},
        { cafeId : 3, cafeImageUrl : "https://127.0.0.1/../images/cafes/3.jpg"},
        { cafeId : 4, cafeImageUrl : "https://127.0.0.1/../images/cafes/4.jpg"},
        { cafeId : 5, cafeImageUrl : "https://127.0.0.1/../images/cafes/5.jpg"},
    ]);
});

// 카페 상세보기
router.get('/:cafeId', isSecure, function(req, res, next) {
    var cafeId = req.params.cafeId;

    res.send({
        cafeId : 1,
        cafeName : "My Coffee",
        cafeAdress : "req 강남구 역삼동",
        phoneNumber : "02-2846-4861",
        details : "우리 카페는 고급스러운 카페입니다.",
        businessHour : "09:00 ~ 21:00",
        options : { wifie: true, days : true, parking : true, socket : true },
        cafeImageUrl : ["http://host/../uploads/images/cafes/1.jpg",
            "http://host/../uploads/images/cafes/2.jpg",
            "http://host/../uploads/images/cafes/3.jpg",
            "http://host/../uploads/images/cafes/4.jpg",
            "http://host/../uploads/images/cafes/5.jpg" ],
        distance : 500,
        options : { wifie : true, days : true, parking : true, socket : true},
        latitude : "37.546846",
        longitude : "127.153458",
        menuImageUrl : "http://host/../uploads/menus/cafes/5.jpg"
    })
});




module.exports = router;