var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Bookmark = require('../models/bookmark');

// 즐겨찾기 하기
router.post('/', isSecure, function(req, res, next) {
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
router.delete('/:cafeId', isAuthenticated, isSecure, function(req, res, next) {
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