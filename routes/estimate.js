var express = require('express');
var router = express.Router();
var Estimate = require('../models/estimate');
var fcm = require('node-gcm');
var isAuthenticated = require('./common').isAuthenticated;
var CronJob = require('cron').CronJob;
var moment = require('moment-timezone');

// 견적서 작성
router.post('/', isAuthenticated, function(req, res, next) {
    var estimateData={};
    var customerId = 1;
    estimateData.customerId = customerId;
    estimateData.people = parseInt(req.body.people || 1);
    estimateData.latitude = parseFloat(req.body.latitude);
    estimateData.longitude = parseFloat(req.body.longitude);
    estimateData.auctionTime = parseInt(req.body.auctionTime || 10);
    estimateData.reservationTime = req.body.reservationTime;
    estimateData.wifi = parseInt(req.body.wifi || 0);
    estimateData.days = parseInt(req.body.days || 0);
    estimateData.parking = parseInt(req.body.parking || 0);
    estimateData.socket = parseInt(req.body.socket || 0);
    Estimate.writeEstimate(estimateData, function(err, result) {
        if (err) {
            return next(err);
        }

        // 견적서가 도착할 카페들에게 보낼 메세지
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
        senderToCafe.send(messageToCafe, {registrationTokens: result.cafeFcmToken}, function(err, response) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message : '견적 요청 완료'
            });

            var timeZone = "Asia/Seoul";
            var future = moment().tz(timeZone).add(estimateData.auctionTime, 'm');
            var cronTime =
                future.second() + " " +
                future.minute() + " " +
                future.hour() + " " +
                future.date() + " " +
                future.month() + " " +
                future.day();

            var job = new CronJob(cronTime, function() {
                // 자신에게 send
                senderToMe.send(messageToMe, {registrationTokens : result.myToken}, function(err, response) {
                    Estimate.endAuction(result.estimateId, function(err, result) {
                        if (err) {
                            return next(err);
                        }
                        res.send(response);
                    });
                });
                job.stop();
            }, function() {

            }, true, timeZone);
        });
    });
});

// 견적서 목록
router.get('/', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.cafeId = parseInt(req.user.id || 0);
    reqData.pageNo = parseInt(req.query.pageNo || 1);
    reqData.rowCount = parseInt(req.query.rowCount || 10);
    Estimate.getEstimateList(reqData, function(err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message: "경매진행중인 견적서 목록입니다.",
            data : results,
            currentPage : reqData.pageNo
        });
    });
});

// 고객용
// 특정 견적서 내용 보기
router.get('/:estimateId', isAuthenticated, function(req, res, next) {
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