var express = require('express');
var router = express.Router();
var isAuthenticated = require('./common').isAuthenticated;
var Proposal = require('../models/proposal');
var fcm = require('node-gcm');

// 입찰하기
router.post('/', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.cafeId = req.user.id;
    reqData.estimateId = parseInt(req.body.estimateId || 0);
    reqData.bidPrice = parseInt(req.body.bidPrice || 0);
    Proposal.doProposal(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        var messageToCustomer = new fcm.Message({
            data : {
                key1 : result.proposalId,
                key2 : result.cafeId,
                key3 : result.cafeName,
                key4 : result.cafeAddress,
                key5 : result.imageUrl,
                key6 : result.wifi,
                key7 : result.days,
                key8 : result.parking,
                key9 : result.socket,
                key10 : result.distance,
                key11 : result.bidPrice
            }
        });
        var senderToCustomer = new fcm.Sender(process.env.FCM_KEY);

        senderToCustomer.send(messageToCustomer, {registrationTokens : result.customerFcmToken}, function(err, response) {
            if (err) {
                return next(err);
            }

            res.send(response, {
                code : 1,
                message : '입찰 완료'
            });
        });
    });
});


// 입찰서 목록
router.get('/', isAuthenticated, function(req, res, next) {
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)){
        var reqData = {};
        reqData.customerId = 1;
        //reqData.customerId = req.user.id;
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
        });
    }
});

// 카페 예약하기
router.put('/:proposalId', isAuthenticated, function(req, res, next) {
    var reqData = {};
    reqData.customerId = req.user.id;
    reqData.proposalId = req.params.proposalId;
    Proposal.doReservation(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
    });
});


module.exports = router;