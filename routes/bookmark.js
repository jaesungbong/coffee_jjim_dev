var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Bookmark = require('../models/bookmark');
var Cafe = require('../models/cafe');

//즐겨 찾기 카페 목록 조회
router.get('/', isSecure, isAuthenticated, function(req, res, next) {
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        var reqData = {};
        reqData.customerId = 1;
        reqData.pageNo = parseInt(req.query.pageNo) || 1;
        reqData.rowCount = parseInt(req.query.rowCount) || 10;
        Cafe.getBookmarkCafe(reqData, function(err, result) {
            res.send({
                message : "즐겨 찾기 카페 입니다.",
                data : result,
                currentPage: reqData.pageNo
            });
        });
    }
});


// 즐겨찾기 하기
router.post('/', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.customerId = 1;
    reqData.cafeId = req.body.cafeId || 0;
    Bookmark.addCafe(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : "즐겨찾기 추가"
        })
    });
});

// 즐겨찾기 카페 삭제
router.delete('/:cafeId', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.customerId = 1;
    reqData.cafeId = req.params.cafeId;
    Bookmark.deleteCafe(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : "즐겨찾기 제거"
        })
    });
});



module.exports = router;