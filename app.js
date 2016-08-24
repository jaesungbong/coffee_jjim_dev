var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var redis = require('redis');
var redisClient = redis.createClient();
var redisStore = require('connect-redis')(session);

var bookmark = require('./routes/bookmark');
var estimate = require('./routes/estimate');
var event = require('./routes/event');
var cafe = require('./routes/cafe');
var auth = require('./routes/auth');
var proposal = require('./routes/proposal');
var notification = require('./routes/notification');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret : process.env.SESSION_SECRET,
  store : new redisStore({
    host : "127.0.0.1",
    port : 6379,
    client : redisClient
  }),
  resave : true,
  saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/images', express.static(path.join(__dirname, 'images/cafes')));
app.use('/cafes', cafe);
app.use('/events', event);
app.use('/proposals', proposal);
app.use('/estimates', estimate);
app.use('/notifications', notification);
app.use('/bookmarks', bookmark);

// app.use('/', routes);
// app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {}
  });
});

module.exports = app;

