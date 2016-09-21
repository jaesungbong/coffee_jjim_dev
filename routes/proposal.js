var express = require('express');
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var Proposal = require('../models/proposal');
var fcm = require('node-gcm');
var logger = require('../config/logger');
var async = require('async');

// 입찰하기
router.post('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- proposal --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.cafeId = req.user.id;
    reqData.estimateId = parseInt(req.body.estimateId || 0);
    reqData.bidPrice = parseInt(req.body.bidPrice || 0);
    Proposal.doProposal(reqData, function(err, result) {
        if (err) {
            return res.send({
                code : 0,
                message : err.message
            });
        }
        var messageToCustomer = new fcm.Message({
            data : {
                key1 : 3
            },
            notification: {
                title : 'COFFEE JJIM',
                icon : 'ic-launcher',
                body : '견적서가 입찰되었습니다.'
            }
        });
        var senderToCustomer = new fcm.Sender(process.env.FCM_KEY);

        senderToCustomer.send(messageToCustomer, {registrationTokens : result}, function(err, response) {
            if (err) {
                logger.log('debug', 'send to customer err : %j', err, {});
            }
            res.send({
                code : 1,
                message : '입찰 완료'
            });
            logger.log('debug', 'send to customer response : %j', response, {});
            logger.log('debug', '-------------- proposal completed --------------');
        });
    });
});

// 입찰카페 목록
router.get('/', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- proposal cafe list --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)){
        var reqData = {};
        reqData.customerId = req.user.id;
        reqData.pageNo = parseInt(req.query.pageNo || 1);
        reqData.rowCount = parseInt(req.query.rowCount || 10);
        Proposal.getProposalList(reqData, function(err, results) {
            if (err) {
                return next(err);
            }
            res.send({
                code : 1,
                message : "입찰카페 리스트 입니다.",
                result : results,
                currentPage : reqData.pageNo
            });
            logger.log('debug', '-------------- proposal cafe list completed --------------');
        });
    }
});

// 예약하기
router.put('/:pid', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- cafe reservation --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'body: %j', req.body, {});
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    var reqData = {};
    reqData.customerId = req.user.id;
    reqData.proposalId = parseInt(req.params.pid || 0 );
    Proposal.doReservation(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        // 날찰 카페에게 보낼 메세지
        var messageToBidCafe = new fcm.Message({
            data: {
                key1 : 4,
                key2 : JSON.stringify(result.estimateId), // 견적서 id
                key3 : JSON.stringify(reqData.proposalId), // 입찰서 id
            },
            notification: {
                title : 'COFFEE JJIM',
                icon : 'ic-launcher',
                body : '카페가 낙찰되었습니다. 확인하시겠습니까?'
            }
        });

        // 낙찰 카페들에게 보낼 샌더
        var senderToBidCafe = new fcm.Sender(process.env.FCM_KEY);

        // 낙찰 카페들에게 send
        senderToBidCafe.send(messageToBidCafe, {registrationTokens: result.bidCafeFcmTokens}, function(err, response) {
            if (err) {
                logger.log('debug', 'send to bid cafe err : &j', err, {});
            }
            logger.log('debug', 'send to bid cafe response : &j', response, {});
            logger.log('debug', 'send to bid cafe completed');
            async.each(result.noBidCafes, function(item, callback) {
                // 유찰 카페에게 보낼 메세지
                var messageToNoBidCafe = new fcm.Message({
                    data: {
                        key1 : 5,
                        key2 : JSON.stringify(result.estimateId), // 견적서 id
                        key3 : JSON.stringify(item.proposalId) // 입찰서 id
                    },
                    notification: {
                        title : 'COFFEE JJIM',
                        icon : 'ic-launcher',
                        body : '죄송합니다. 카페가 유찰되었습니다.'
                    }
                });
                // 유찰 카페에게 보낼 샌더
                var senderToNoBidCafe = new fcm.Sender(process.env.FCM_KEY);
                // 유찰 카페들에게 send
                var regiTokens = [];
                regiTokens.push(item.fcmToken);
                senderToNoBidCafe.send(messageToNoBidCafe, {registrationTokens: regiTokens}, function(err, response) {
                    if (err) {
                        callback(err);
                    } else {
                        logger.log('debug', 'send to no bid cafe response : &j', response, {});
                        callback(null);
                    }
                });
            }, function(err) {
                if (err) {
                    logger.log('debug', 'send to no bid cafe err : &j', err, {});
                } else {
                    res.send({
                        code : 1,
                        message : '예약 완료'
                    });
                    logger.log('debug', '-------------- cafe reservation completed --------------');
                }
            });
        });
    });
});


module.exports = router;