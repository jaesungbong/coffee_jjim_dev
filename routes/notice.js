var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isSecure;

router.get('/', isSecure, isAuthenticated, function(req, res, next) {
    if(req.url.match(/\/?pageNo=\d+&rowCount=\d+/i)) {
        res.send({
            notices : [{
                title: "역경매 카페목록 업데이트 안내",
                content: "서버 점검일정을 안내드립니다.",
                dateTime: "2016 - 08 - 46 08: 08:00"
            }]
        });
    }
});

module.exports = router;