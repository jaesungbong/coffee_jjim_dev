var express = require('express');
var router = express.Router();
var Estimate = require('../models/estimate');
var fcm = require('node-gcm');
var isAuthenticated = require('./common').isAuthenticated;
var isSecure = require('./common').isSecure;
var CronJob = require('cron').CronJob;
var moment = require('moment-timezone');
var logger = require('../config/logger');

// 견적서 작성
router.post('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- estimate request --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var estimateData={};
    estimateData.customerId = req.user.id;
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
            return res.send({
                code : 0,
                message : err.message
            });
        }
        // 견적서가 도착할 카페들에게 보낼 메세지
        var messageToCafe = new fcm.Message({
            data : {
                key1 : 1
            },
            notification: {
                title : 'COFFEE JJIM',
                icon : 'ic-launcher',
                body : '견적서가 도착했습니다.'
            }
        });

        //자신에게 보낼 메세지
        var messageToMe = new fcm.Message({
            data : {
                key1 : 2
            },
            notification : {
                title : '경매 종료',
                icon : 'ic-launcher',
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
                logger.log('debug', 'send to cafe err : %j', err, {});
            }
            res.send({
                code : 1,
                message : '견적 요청 완료',
            });
            logger.log('debug', 'send to cafe response : %j', response, {});
            logger.log('debug', 'send to cafe completed');

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
                    if (err) {
                        logger.log('debug', 'sender to me err : %j', err, {});
                    }
                    logger.log('debug', 'sender to me response : %j', response, {});
                    Estimate.endAuction(result.estimateId, function(err, result) {
                        if (err) {
                            logger.log('debug', 'end auction err : %j', err, {});
                        }
                        logger.log('debug', 'end auction result : %s', result, {});
                        logger.log('debug', 'send to me completed');
                        logger.log('debug', '-------------- estimate request completed --------------');
                    });
                });
                job.stop();
            }, function() {

            }, true, timeZone);
        });
    });
});

// 예약현황
router.get('/booked', isSecure, isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- customer & cafe reservation list --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var timeZone = "Asia/Seoul";
    var present = moment().tz(timeZone);
    if(req.url.match(/\/?type=\d+&year=\d+&month=\d+/i)) {
        var reqData = {};
        reqData.type = parseInt(req.query.type);
        reqData.year = parseInt(req.query.year || present.year());
        reqData.month = parseInt(req.query.month || (present.month() + 1));
        if (reqData.type === 0) { //고객용
            reqData.customerId = req.user.id;
            Estimate.getBookedEstimateForCustomer(reqData, function (err, results) {
                if (err) {
                    return next (err);
                }
                res.send({
                    code : 1,
                    message : "고객용 예약 현황 입니다.",
                    result : results,
                    currentYear : reqData.year,
                    currentMonth : reqData.month
                });
                logger.log('debug', '-------------- customer reservation list --------------');
            });
        } else if (reqData.type === 1) { //점주용
            reqData.cafeId = req.user.id;
            Estimate.getBookedEstimateForCafe(reqData, function (err, results) {
                if (err) {
                    return next (err);
                }
                res.send({
                    code : 1,
                    message : "카페용 예약 현황 입니다.",
                    result : results,
                    currentYear : reqData.year,
                    currentMonth : reqData.month
                });
                logger.log('debug', '-------------- cafe reservation list --------------');
            })
        } else {
            return next(new Error('타입은 0 또는 1 입니다.'));
        }
    }
});

// 예약된 견적서 보기
router.get('/:eid/proposals/:pid', isSecure, isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- booked estimate info --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.cafeId = req.user.id;
    reqData.estimateId = parseInt(req.params.eid);
    reqData.proposalId = parseInt(req.params.pid);
    Estimate.getBookedEstimateInfo(reqData, function (err, results) {
        if (err) {
            return next(err);
        }
        res.send({
            code: 1,
            message: "예약 견적서.",
            result: results,
        });
        logger.log('debug', '-------------- booked estimate info completed --------------');
    });
});

// 견적서 목록
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- estimate list --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        var reqData = {};
        reqData.id = req.user.id;
        reqData.pageNo = parseInt(req.query.pageNo || 1);
        reqData.rowCount = parseInt(req.query.rowCount || 10);
        Estimate.getEstimateList(reqData, function (err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                code: 1,
                message: "경매진행중인 견적서 목록입니다.",
                result: results,
                currentPage: reqData.pageNo
            });
            logger.log('debug', '-------------- estimate list completed --------------');
        });
    }
});

module.exports = router;