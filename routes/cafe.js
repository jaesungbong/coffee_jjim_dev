var express = require('express');
var url = require('url');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var Cafe = require('../models/cafe');
var formidable = require('formidable');
var path = require('path');
var async = require('async');

//점주 회원 가입
router.post('/', isSecure, function(req, res, next) {
    var cafeData = {};
    if(!(req.body.ownerName && req.body.ownerLoginId && req.body.password && req.body.ownerPhoneNumber && req.body.ownerEmail && req.body.cafeName && req.body.cafeAddress && req.body.latitude && req.body.longitude && req.body.cafePhoneNumber)) {
        return next(new Error('정보를 모두 입력하세요.'))
    } else {
        cafeData.ownerName = req.body.ownerName;
        cafeData.ownerLoginId = req.body.ownerLoginId;
        cafeData.password = req.body.password;
        cafeData.ownerPhoneNumber = req.body.ownerPhoneNumber;
        cafeData.ownerEmail = req.body.ownerEmail;
        cafeData.cafeName = req.body.cafeName;
        cafeData.cafeAddress = req.body.cafeAddress;
        cafeData.latitude = parseFloat(req.body.latitude);
        cafeData.longitude = parseFloat(req.body.longitude);
        cafeData.cafePhoneNumber = req.body.cafePhoneNumber;
        Cafe.registerCafe(cafeData, function (err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                message: '회원 가입!'
            });
        });
    }
});

// 카페 보기
router.get('/', isSecure, function(req, res, next) {
    // 검색 카페 보기
    if(req.query.keyword && req.query.pageNo && req.query.rowCount && req.query.latitude && req.query.longitude){
        Cafe.getKeyWordCafe(req.query.keyword, parseInt(req.query.pageNo), parseInt(req.query.rowCount), parseFloat(req.query.latitude), parseFloat(req.query.longitude), function(err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                message : '검색 카페 입니다.',
                data : results,
                currentPage : req.query.pageNo
            });
        });
    } else if (req.query.pageNo && req.query.rowCount && req.query.latitude && req.query.longitude) { //모든 카페 보기
        Cafe.getAllCafe(parseInt(req.query.pageNo), parseInt(req.query.rowCount), parseFloat(req.query.latitude), parseFloat(req.query.longitude), function(err, results) {
            if (err) {
               return next(err);
            }
            res.send({
                message : '모든 카페 입니다.',
                data : results,
                currentPage : req.query.pageNo
            });
        });
    } else {
        return next(new Error('키워드 혹은 위도 경도를 지정해 주세요.'));
    }
});

// 베스트 카페 목록5개 조회, GET /cafes/best5
router.get('/best5', isSecure, function(req, res, next) {
    Cafe.getBest5Cafe(function (err, results) {
        res.send({
            message : 'best5 카페 입니다.',
            data : results
        });
    });
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

//점주용
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
router.get('/:cafeId', isSecure, function(req, res, next) {
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

//점주용
//카페 정보 편집
router.put('/me', isSecure, isAuthenticated, function(req, res, next) {
    if (!req.body.type) {
        return next(new Error('타입을 지정해 주세요'));
    }
    if ((parseInt(req.body.type) === 0) && req.body.cafeAddress && req.body.cafePhoneNumber && req.body.businessHour && req.body.options){
        var cafeData= {};
        cafeData.id = req.user.id;
        cafeData.cafeAddress = req.body.cafeAddress;
        cafeData.cafePhoneNumber = req.body.cafePhoneNumber;
        cafeData.businessHour = req.body.businessHour;
        cafeData.latitude = parseFloat(req.body.latitude);
        cafeData.longitude = parseFloat(req.body.longitude);
        var options = JSON.parse(req.body.options);
        cafeData.wifi = parseInt(options.wifi);
        cafeData.days = parseInt(options.days);
        cafeData.parking = parseInt(options.parking);
        cafeData.socket = parseInt(options.socket);
        Cafe.editCafe(cafeData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                message : '카페 정보 변경 완료'
            })
        });
    } else if ((parseInt(req.body.type) === 1) && req.body.ownerName && req.body.password && req.body.ownerPhoneNumber && req.body.ownerEmail){
        var ownerData = {};
        ownerData.id = req.user.id;
        ownerData.ownerName = req.body.ownerName;
        ownerData.password = req.body.password;
        ownerData.ownerPhoneNumber = req.body.ownerPhoneNumber;
        ownerData.ownerEmail = req.body.ownerEmail;
        Cafe.editOwner(ownerData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
               message : '점주 정보 변경 완료'
            });
        });
    } else {
        return next(new Error('정보를 모두 입력해 주세요'));
    }
});

//카페 이미지 업로드&수정
router.put('/images', isSecure, isAuthenticated, function(req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../images/cafes');
    form.keepExtensions = true;
    form.multiples = false;
    form.parse(req, function(err, fields, files) {
        if (err) {
            return next(err);
        }
        if (files) {
            if(!Object.keys(files).toString().match(/photo\d+/i)){
                next(new Error('file key이름을 확인해 주세욥'))
            }
            var sequence = parseInt(Object.keys(files).toString().substring(5, 6));
            var imageFile = files["photo" + sequence];

            Cafe.insertOrEditImages(req.user.id, imageFile, sequence, function (err, result) {
                if (err) {
                    return next(err);
                }
                res.send({
                    message: '이미지 업로드 완료!',
                });
            });
        } else {
            return next(new Error('파일을 올려주세요'));
        }
    });
});


//점주용
//ID 중복확인
router.post('/duplication', isSecure, function(req, res, next) {
    if(!req.body.ownerLoginId){
        return next(new Error('아이디 입력해주세요'));
    }
    Cafe.checkId(req.body.ownerLoginId, function(err, result) {
        if (err) {
            return next(err)
        }
        res.send({
            message: result
        });
    });
});


module.exports = router;