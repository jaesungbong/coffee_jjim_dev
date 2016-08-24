var express = require('express');
var router = express.Router();
var fcm = require('node-gcm');

//견적 요청을 점주에게 전달
// DB 작업 : 견적서 상태를 경매 진행으로 바꿈
router.post('/estimate', function(req, res, next) {
    var estimateId = req.body.estimateId;
    res.send({
        estimateId : estimateId
    })
});

// 고객이 지정한 경매시간이 종료되면 자신에게 알람 보내기
// DB 작업 : 견적서 상태를 경매 종료로 바꿈
router.post('/auctionend', function(req, res, next) {
    var estimateId = req.body.estimateId;
    res.send({
        estimateId : estimateId
    })
});

// 고객이 예약을 완료하면 점주에게 알람
router.post('/reservation', function(req, res, next) {
    var proposalId = req.body.proposalId;
    res.send({
        proposalId : proposalId
    })
});
// router.post('/', function(req, res, next){
//     var ids = req.body.ids; //만약에 보낼 사람의 정보가 넘어온다 하면 이런식으로 넘어온다.
//     //var message = req.body.message; //서버에서 혹은 클라이언트에서 메세지를 만들수 있음.
//
//     //token을 select
//     //message 를 insert
//
//     var tokens = []; //이 안에는 token들이 들어가 있음.
//     var message = new fcm.message({
//         data: {
//             key1 : "value1",
//             key2 : "value2"
//         },
//         notification: {
//             title : "",
//             icon : "",
//             body : ""
//         }
//     });
//
//     var sender = new fcm.sender(process.env.FCM_KEY); //서버 API키를 받아와야함.
//
//     sender.send(message, {registrationTokens: tokens}, function(err, response) {
//         if (err) {
//             return next(err);
//         }
//         res.send(response);
//     })
// });

module.exports = router;