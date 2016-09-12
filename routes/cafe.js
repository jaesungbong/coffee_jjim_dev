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
var logger = require('../config/logger');

//카페 회원 가입
router.post('/', isSecure, function(req, res, next) {
    logger.log('debug', '-------------- cafe sing up --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
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
            code : 1,
            message: '회원 가입!'
        });
        logger.log('debug', '-------------- cafe sing up completed --------------');
    });
});

// 모든 & 검색 카페 목록
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- all & search cafe list --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
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
                code : 1,
                message : '검색 카페 입니다.',
                result : results,
                currentPage : req.query.pageNo
            });
            logger.log('debug', '-------------- search cafe list completed --------------');
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
                code : 1,
                message : '모든 카페 입니다.',
                result : results,
                currentPage : req.query.pageNo
            });
            logger.log('debug', '-------------- all cafe list completed --------------');
        });
    }
});

//ID 중복확인
router.get('/checkid', function(req, res, next) {
    logger.log('debug', '-------------- check id --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var idToCheck = req.query.ownerLoginId || 0 ;
    Cafe.checkId(idToCheck, function(err, result, message) {
        if (err) {
            return next(err)
        }
        res.send({
            code : result,
            message : message
        });
        logger.log('debug', '-------------- check id completed --------------');
    });
});

// 베스트 카페 목록
router.get('/best5', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- best cafe --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    Cafe.getBest5Cafe(function (err, results) {
        res.send({
            message : 'best5 카페 입니다.',
            result : results
        });
        logger.log('debug', '-------------- best cafe completed --------------');
    });
});

// 뉴 카페 목록
router.get('/new5', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- new cafe --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    Cafe.getNewCafe(function (err, results) {
        res.send({
            message : 'new 카페 입니다.',
            result : results
        });
        logger.log('debug', '-------------- new cafe completed --------------');
    });
});

//자기 카페&정보 보기
router.get('/me', isSecure, isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- cafe & owner info --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var type = parseInt(req.query.type || 2);
    if ( type === 2 ) {
        return next(new Error('카페 정보 보기 타입은 0 점주 정보 보기 타입은 1 입니다.'));
    } else if (type === 0) {
        Cafe.getCafeInfo(req.user.id, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message: '카페 정보 입니다.',
                result : result
            });
            logger.log('debug', '-------------- cafe info completed --------------');
        });
    } else if (type === 1) {
        Cafe.getOwnerInfo(req.user.id, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message : '점주 정보 입니다.',
                result : result
            });
            logger.log('debug', '-------------- owner info completed --------------');
        });
    }
});

// 아이디 비밀번호 찾기
router.put('/find', isSecure, function(req, res, next) {
    logger.log('debug', '-------------- find id & password --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var ownerEmail = req.body.ownerEmail.trim();
    Cafe.findIdPassword(ownerEmail, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message : '아이디 비밀번호 찾기 신청 완료',
            result : result
        });
        logger.log('debug', '-------------- find id & password completed --------------');
    });
});

// 카페 상세보기
router.get('/:id', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- cafe detail info --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    Cafe.getCafeInfo(req.params.id, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            message : '카페 정보 입니다.',
            result : result
        });
        logger.log('debug', '-------------- cafe detail info completed --------------');
    });
});

// 카페 & 점주 & 비밀번호 정보 수정
router.put('/me', isSecure, isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- cafe & owner & password edit --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.type = parseInt(req.body.type || 3);
    reqData.cafeId = req.user.id;
    if (reqData.type === 0) { // 카페 정보 수정
        reqData.cafeAddress = req.body.cafeAddress;
        reqData.cafePhoneNumber = req.body.cafePhoneNumber;
        reqData.businessHour = req.body.businessHour;
        reqData.latitude = parseFloat(req.body.latitude);
        reqData.longitude = parseFloat(req.body.longitude);
        reqData.wifi = parseInt(req.body.wifi || 0);
        reqData.days = parseInt(req.body.days || 0);
        reqData.parking = parseInt(req.body.parking || 0);
        reqData.socket = parseInt(req.body.socket || 0);
        Cafe.editCafe(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message : '카페 정보 변경 완료'
            });
            logger.log('debug', '-------------- cafe edit completed --------------');
        });
    } else if (reqData.type === 1) { //점주 정보 수정
        reqData.ownerName = req.body.ownerName;
        reqData.password = req.body.password;
        reqData.ownerPhoneNumber = req.body.ownerPhoneNumber;
        reqData.ownerEmail = req.body.ownerEmail;
        Cafe.editOwner(reqData, function(err, result) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message : '점주 정보 변경 완료'
            });
            logger.log('debug', '-------------- owner edit completed --------------');
        });
    } else if (reqData.type === 2) {
        // 임시 비밀번호 발급
    } else {
        return next(new Error('타입을 잘못 입력했음.'));
    }
});




module.exports = router;