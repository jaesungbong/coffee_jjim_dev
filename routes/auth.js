var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookTokenStrategy = require('passport-facebook-token');
var Cafe = require('../models/cafe');
var User = require('../models/user');
var Customer = require('../models/customer');
var isSecure = require('./common').isSecure;
var KakaoStrategy = require('passport-kakao').Strategy;

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


passport.use(new FacebookTokenStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET
}, function(accessToken, refreshToken, profile, done) {
    Customer.findOrCreate(profile, function (err, user) {
        if (err) {
            return done(err);
        }
        return done(null, user);
    });
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

router.post('/local/login', isSecure, function(req, res, next) {
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
            message: '로그인 OK!'
        });
    });
});

//로그아웃
router.get('/local/logout', function(req, res, next) {
    req.logout();
    res.send({ message: '로그아웃!' });
});

router.post('/facebook/token', isSecure, passport.authenticate('facebook-token', {scope : ['email']}), function(req, res, next) {
    res.send(req.user? '페이스북 로그인' : '실패');
});

module.exports = router;