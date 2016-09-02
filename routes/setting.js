var express = require('express');
var router = express.Router();
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;

router.put('/', isSecure, isAuthenticated, function(req, res, next) {
    var auctionRange = req.body.auctionRange;
    res.send({
        auctionRange : auctionRange
    });
});
module.exports = router;