var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var Cafe = require('../models/cafe');
var User = require('../models/user');
var Customer = require('../models/customer');
var isSecure = require('./common').isSecure;
var isAuthenticated = require('./common').isAuthenticated;
var KakaoStrategy = require('passport-kakao').Strategy;
var KakaoTokenStrategy = require('passport-kakao-token').Strategy;
var logger = require('../config/logger');

// 카페 로그인 strategy
passport.use(new LocalStrategy({usernameField: 'ownerLoginId', passwordField: 'password'}, function(ownerLoginId, password, done) {
    Cafe.findByOwnerLoginId(ownerLoginId, function(err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false);
        }
        Cafe.verifyPassword(password, user.password, function(err, result) {
            if (err) {
                return done(err);
            }
            if (!result) {
                return done(null, false);
            }
            delete user.password;
            done(null, user);
        })
    })
}));

// 카카오 콜백 strategy
passport.use(new KakaoStrategy({
        clientID : process.env.KAKAO_APP_ID,
        callbackURL : process.env.KAKAO_CALLBACK_URL
    },
    function(accessToken, refreshToken, profile, done){
        console.log(accessToken);
        Customer.findOrCreate(profile, function(err, user) {
            if (err) {
                return done(err);
            }
            done(null, user);
        });
    }
));

// 카카오 토큰 strategy
passport.use(new KakaoTokenStrategy({
        clientID : process.env.KAKAO_APP_ID,
    },
    function(accessToken, refreshToken, profile, done){
        Customer.findOrCreate(profile, function(err, user) {
            if (err) {
                return done(err);
            }
            done(null, user);
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.userId);
});

passport.deserializeUser(function(userId, done) {
    User.findUser(userId, function(err, user) {
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
    console.log('reqUser : ' + req.user);
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

// 로그아웃
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

// 카카오 콜백
router.get('/kakao/callback', isSecure, passport.authenticate('kakao'), function(req, res, next) {
    res.send({ message: 'kakao callback' });
});

// 카카오 로그인
router.get('/kakao/token', isSecure, passport.authenticate('kakao-token'), function (req, res, next) {
    if (req.user && req.query.fcmToken) {
        var reqData = {};
        reqData.customerId = req.user.id;
        reqData.fcmToken = req.query.fcmToken;
        Customer.setFcmToken(reqData, function(err, result) {
           if (err) {
               return next(err);
           }
           res.send({
               code : 1,
               message : '고객 로그인 OK!'
           })
        });
    } else {
        res.send({
            code : 2,
            message : '고객 로그인 실패'
        })
    }
});


module.exports = router;