var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var KakaoStrategy = require('passport-kakao').Strategy;

module.exports = router;