var subdomain = require('express-subdomain');
var express = require('express');
var http = require('http');
var path = require('path');
var logger = require('morgan');
var favicon = require('static-favicon');
var logger = require('morgan');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var flash = require('express-flash-messages');
var cookieSession = require('cookie-session');
var fs = require('fs');
var url = require('url');
var https = require('https');
var forceSsl = require('express-force-ssl');

var routes = require('./routes');
var users = require('./routes/user');
var firebase = require('firebase');

var constant = require('./routes/constant');
// console.log("config : ",config);
// console.log("firebase config...");
// console.log(constant.config);

firebase.initializeApp(constant.config);

console.log("firebase initApp...");

var app = express();

var key = fs.readFileSync('./encryption/private.key');
var cert = fs.readFileSync( './encryption/8af791ffb0f31f00.crt' );
var ca = fs.readFileSync( './encryption/gd_bundle-g2-g1.crt' );

var options = {
    key: key,
    cert: cert,
    ca: ca
};

// https.createServer(options, app).listen(443);

var sessionStore = new session.MemoryStore;
var message = "";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
    name: 'session',
    keys:  ['key1', 'key2'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));


app.use(flash());
//app.use(forceSsl);

app.get('*.js', function(req, res, next) {
    req.url = req.url + '.gz';
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', 'text/javascript');
    next();
});
app.get('*.css', function(req, res, next) {
    req.url = req.url + '.gz';
    res.set('Content-Encoding', 'gzip');
    res.set('Content-Type', 'text/css');
    next();
});

//----------Manager Panel--------

var routerManager = express.Router();

//Prelogin
routerManager.get(constant.managerUrl, users.index);
routerManager.post('/login', users.login);
routerManager.post('/forgotPassword', users.forgotPassword);
routerManager.get('/logout', users.logout);

routerManager.get('/profile', users.profile);
routerManager.post('/updateProfile', users.updateProfile);

//DAshboard
routerManager.get('/dashboard', users.dashboard);
routerManager.get('/changePassword', users.changePassword);
routerManager.post('/updatePassword', users.updatePassword);

//Gym Profile
routerManager.post('/updateGym', users.updateGym);
routerManager.get('/managerGym', users.managerGym);

//CheckIns
routerManager.get('/listCheckIn', users.listCheckIn);
routerManager.get('/listNewCheckIn', users.listNewCheckIn);
routerManager.post('/checkInViaManager',users.checkInViaManager);

// Banking
routerManager.get('/banking', users.banking);
routerManager.post('/saveBankInfo', users.saveBankInfo);

// To run in local environment uncomment following line
app.use(routerManager);

// To run in production environment uncomment following line
// app.use(subdomain('mgr', routerManager));

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;

    next(err);
});

/// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;