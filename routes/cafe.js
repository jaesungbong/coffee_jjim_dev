var express = require('express');
var url = require('url');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Cafe = require('../models/cafe');
var formidable = require('formidable');
var path = require('path');
var async = require('async');
var fs = require('fs');

//카페 회원 가입
router.post('/', isSecure, function(req, res, next) {
    var reqData = {};
    reqData.ownerName = req.body.ownerName || 'ownerName' ;
    reqData.ownerLoginId = req.body.ownerLoginId || 'ownerLoginId';
    reqData.password = req.body.password || '1111' ;
    reqData.ownerPhoneNumber = req.body.ownerPhoneNumber || '010-0000-0000' ;
    reqData.ownerEmail = req.body.ownerEmail || 'email@email.com';
    reqData.cafeName = req.body.cafeName || 'cafeName' ;
    reqData.cafeAddress = req.body.cafeAddress || 'cafeAddress' ;
    reqData.latitude = parseFloat(req.body.latitude || 37.552788)  ;
    reqData.longitude = parseFloat(req.body.longitude || 126.981328);
    reqData.cafePhoneNumber = req.body.cafePhoneNumber || '010-1234-4567';
    reqData.fcmToken = req.body.fcmToken || '1111' ;
    Cafe.registerCafe(reqData, function (err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message: '회원 가입!'
        });
    });
});

// 카페 보기
router.get('/', isSecure, isAuthenticated, function(req, res, next) {
    var keyword = req.query.keyword;
    var reqData = {};
    // 키워드가 있을 경우 검색 카페 보기
    if (keyword) {
        reqData.keyword = keyword;
        reqData.pageNo = parseInt(req.query.pageNo || 1);
        reqData.rowCount = parseInt(req.query.rowCount || 10);
        reqData.latitude = parseFloat(req.query.latitude);
        reqData.longitude = parseFloat(req.query.longitude);
        Cafe.getKeyWordCafe(reqData, function(err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message : '검색 카페 입니다.',
                data : results,
                currentPage : req.query.pageNo
            });
        });
    // 키워드가 없을 경우 주변 모든 카페 보기
    } else {
        reqData.pageNo = parseInt(req.query.pageNo || 1);
        reqData.rowCount = parseInt(req.query.rowCount || 10);
        reqData.latitude = parseFloat(req.query.latitude);
        reqData.longitude = parseFloat(req.query.longitude);
        Cafe.getAllCafe(reqData, function(err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message : '모든 카페 입니다.',
                data : results,
                currentPage : req.query.pageNo
            });
        });
    }
});

//ID 중복확인
router.get('/checkid', function(req, res, next) {
    var id = req.query.ownerLoginId || 0 ;
    Cafe.checkId(id, function(err, result) {
        if (err) {
            return next(err)
        }
        res.send({
            message: result
        });
    });
});

// 베스트 카페 목록5개 조회
router.get('/best5', isSecure, isAuthenticated, function(req, res, next) {
    Cafe.getBest5Cafe(function (err, results) {
        res.send({
            message : 'best5 카페 입니다.',
            data : results
        });
    });
});


// 새로운 카페 목록 5개 조회
router.get('/new5', isSecure, isAuthenticated, function(req, res, next) {
    Cafe.getNewCafe(function (err, results) {
        res.send({
            message : 'new 카페 입니다.',
            data : results
        });
    });
});


//자기 카페 보기
router.get('/me', isSecure, isAuthenticated, function(req, res, next) {
    Cafe.getCafeInfo(req.user.id, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : '카페 정보 입니다.',
            data : result
        });
    });
});


// 카페 상세보기
router.get('/:cafeId', isSecure, isAuthenticated, function(req, res, next) {
    Cafe.getCafeInfo(req.params.cafeId, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : '카페 정보 입니다.',
            data : result
        });
    });
});


//카페 정보 수정
router.put('/me', isSecure, isAuthenticated, function(req, res, next) {
    var type = parseInt(req.body.type || 2);
    if (type === 2) {
        return next(new Error('카페 정보수정의 타입은 0 점주 정보 수정 타입은 1 입니다.'));
    } else if (type === 0) { // 카페 정보 수정
        var reqData= {};
        reqData.id = req.user.id;
        reqData.cafeAddress = req.body.cafeAddress;
        reqData.cafePhoneNumber = req.body.cafePhoneNumber;
        reqData.businessHour = req.body.businessHour;
        reqData.latitude = parseFloat(req.body.latitude);
        reqData.longitude = parseFloat(req.body.longitude);
        var options = JSON.parse(req.body.options);
        reqData.wifi = parseInt(options.wifi);
        reqData.days = parseInt(options.days);
        reqData.parking = parseInt(options.parking);
        reqData.socket = parseInt(options.socket);
        Cafe.editCafe(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                message : '카페 정보 변경 완료'
            })
        });
    } else if (type === 1) { //점주 정보 수정
        var reqData = {};
        reqData.id = req.user.id;
        reqData.ownerName = req.body.ownerName;
        reqData.password = req.body.password;
        reqData.ownerPhoneNumber = req.body.ownerPhoneNumber;
        reqData.ownerEmail = req.body.ownerEmail;
        Cafe.editOwner(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
               message : '점주 정보 변경 완료'
            });
        });
    }
});




module.exports = router;