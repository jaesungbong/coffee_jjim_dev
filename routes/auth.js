var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Cafe = require('../models/cafe');
var User = require('../models/user');
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var KakaoStrategy = require('passport-kakao').Strategy;
var logger = require('../config/logger');

// 카페 로그인 strategy
passport.use(new LocalStrategy({usernameField: 'ownerLoginId', passwordField: 'password'}, function(ownerLoginId, password, done) {
    Cafe.findByOwnerLoginId(ownerLoginId, function(err, cafePassword, user) {
        if (err) {
            return done(err);
        }
        if (!cafePassword) {
            return done(null, false);
        }
        Cafe.verifyPassword(password, cafePassword, function(err, result) {
            if (err) {
                return done(err);
            }
            if (!result) {
                return done(null, false);
            }
            done(null, user);
        })
    })
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findUser(id, function(err, user) {
        if (err) {
            return done(err);
        }
        done(null, user);
    });
});

// 카페 로그인
router.post('/local/login', isSecure, function(req, res, next) {
    //로그인 로거
    logger.log('debug', '-------------- cafe login --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    passport.authenticate('local', function(err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).send({
                message: '로그인 실패'
            });
        }
        req.login(user, function(err) {
            if (err) {
                return next(err);
            }
            next();
        });
    })(req, res, next);
}, function(req, res, next) {
    var reqData = {};
    reqData.fcmToken = req.body.fcmToken;
    reqData.ownerLoginId = req.body.ownerLoginId;
    Cafe.updateFcmToken(reqData, function(err, result) {
        if (err) {
            return next(err);
        }
        res.send({
            code : 1,
            message: '로그인 OK!'
        });
        logger.log('debug', '-------------- login completed --------------');
    });
});

//로그아웃
router.get('/local/logout', isAuthenticated, function(req, res, next) {
    logger.log('debug', '-------------- logout --------------');
    logger.log('debug', '%s %s://%s%s', req.method, req.protocol, req.headers['host'], req.originalUrl);
    logger.log('debug', 'baseUrl: %s', req.baseUrl);
    logger.log('debug', 'url: %s', req.url);
    logger.log('debug', 'query: %j', req.query, {});
    logger.log('debug', 'range: %s', req.headers['range']);
    req.logout();
    res.send({ message: '로그아웃!' });
    logger.log('debug', '-------------- logout completed --------------');
});

module.exports = router;