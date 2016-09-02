var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var Estimate = require('../models/estimate');
var fcm = require('node-gcm');
var isAuthenticated = require('./common').isAuthenticated;

// 고객용
// 견적서 작성
router.post('/', isSecure, isAuthenticated, function(req, res, next) {
    var estimateData={};
    var customerId = 1;
    estimateData.customerId = customerId;
    estimateData.people = parseInt(req.body.people) || 1;
    estimateData.latitude = parseFloat(req.body.latitude);
    estimateData.longitude = parseFloat(req.body.longitude);
    estimateData.auctionTime = parseInt(req.body.auctionTime) || 10;
    estimateData.reservationTime = req.body.reservationTime;
    estimateData.options = JSON.parse(req.body.options);
    Estimate.writeEstimate(estimateData, function(err, result) {
        if (err) {
            return next(err);
        }
        // 보낼 카페들의 토큰
        var cafeTokens = result.fcmToken;
        // 자신의 토큰
        var myTokens = result.myToken;
        //카페들에게 보낼 메세지
        var messageToCafe = new fcm.Message({
            data: {
                key1 : JSON.stringify(result.estimateId), //견적서 id
                key2 : JSON.stringify(result.nickname), //고객 닉네임
                key3 : JSON.stringify(result.auctionStartTime), // 경매 시작 날짜 시간
                key4 : JSON.stringify(result.deadlineTime), //마감 날짜 시간
                key5 : JSON.stringify(result.reservationTime), //예약 날짜 시간
                key6 : JSON.stringify(result.people), // 인원
                key7 : JSON.stringify(result.wifi), //와이파이
                key8 : JSON.stringify(result.days), //24시간
                key9 : JSON.stringify(result.parking), // 주차
                key10 : JSON.stringify(result.socket), // 콘센트
                key11 : JSON.stringify(result.proposalState) //입찰 상태
            },
            notification: {
                title : '견적서 도착',
                icon : '견적서 도착',
                body : '견적서 도착'
            }
        });
        //자신에게 보낼 메세지
        var messageToMe = new fcm.Message({
            data : {

            },
            notification : {
                title : '경매 종료',
                icon : '경매 종료',
                body : '경매 종료'
            }
        });

        // 카페들에게 보낼 샌더
        var senderToCafe = new fcm.Sender(process.env.FCM_KEY);

        // 자신에게 보낼 샌더
        var senderToMe = new fcm.Sender(process.env.FCM_KEY);

        // 카페들에게 send
        senderToCafe.send(messageToCafe, {registrationTokens: cafeTokens}, function(err, response) {
            if (err) {
                return next(err); //이곳에서 400 error발생
            }
            res.send(response);

            //자신에게 send
            setTimeout(function(){
                senderToMe.send(messageToMe, {registrationTokens : myTokens}, function(err, response) {
                    Estimate.endAuction(result.estimateId, function(err, result) {
                        if (err) {
                            return next(err);
                        }
                    });
                    res.send(response, result.estimateId);
                }, 1000 * 60 * estimateData.auctionTime);
            });
        });
    });
});

// 점주용
// 자신에게 들어온 견적 목록 보기
router.get('/', isSecure, isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.cafeId = parseInt(req.user.id || 0);
    reqData.pageNo = parseInt(req.query.pageNo || 1);
    reqData.rowCount = parseInt(req.query.rowCount || 10);
    Estimate.getEstimateList(reqData, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            message: "경매진행중인 견적서 목록입니다.",
            data : results
        });
    });
});

// 고객용
// 특정 견적서 내용 보기
router.get('/:estimateId', isSecure, isAuthenticated, function(req, res, next) {
    var estimateId = req.params.estimateId;
    res.send({
        auctionStartDateTime : "2016-05-04",
        cafeAddress : "서울시 강남구",
        reservationDateTime : "2018-05-05 12:00:00",
        people : 3,
        options : { wifi : true, days : true, parking : false, soket : false },
        auctionTime : 20
    });
});


module.exports = router;