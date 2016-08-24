var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;

//이벤트 썸네일 보기
router.get('/', isSecure, function(req, res, next) {
    res.send([
            { eventId : 1, eventImageUrl : "https://127.0.0.1/../images/events/1.jpg"},
            { eventId : 2, eventImageUrl : "https://127.0.0.1/../images/events/2.jpg"},
            { eventId : 3, eventImageUrl : "https://127.0.0.1/../images/events/3.jpg"},
    ]);
});

module.exports = router;