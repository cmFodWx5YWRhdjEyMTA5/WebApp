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
var https = require('https');

var routes = require('./routes');
var users = require('./routes/user');
var admin = require('./routes/admin');
var firebase = require('firebase');

var constant = require('./routes/constant');

// console.log("config : ",config);

console.log("firebase config...");
console.log(constant.config);

firebase.initializeApp(constant.config);

console.log("firebase initApp...");

var app = express();
var sessionStore = new session.MemoryStore;

var message = "";

var key = fs.readFileSync('./encryption/private.key');
var cert = fs.readFileSync( './encryption/42d9912f2e6a201d.crt' );
var ca = fs.readFileSync( './encryption/gd_bundle-g2-g1.crt' );



var options = {
    key: key,
    cert: cert,
    ca: ca
  };

https.createServer(options, app).listen(443);

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

app.use(subdomain('mgr', routerManager));

//----------Admin Panel--------

var routerAdmin = express.Router();

//Prelogin
routerAdmin.get(constant.adminUrl, admin.index);
routerAdmin.post('/adminLogin', admin.adminLogin);
routerAdmin.post('/adminForgotPassword',admin.adminForgotPassword);
routerAdmin.get('/adminLogout',admin.adminLogout);

//Dashboard
routerAdmin.get('/adminDashboard', admin.adminDashboard);
routerAdmin.get('/adminChangePassword', admin.adminChangePassword);
routerAdmin.post('/adminUpdatePassword', admin.adminUpdatePassword);

//Gym
routerAdmin.get('/manageGym', admin.manageGym);
routerAdmin.get('/addGymByAdmin', admin.addGym);
routerAdmin.post('/addNewGym',admin.addNewGym);
routerAdmin.get('/adminGymUpdate/:gymId',admin.adminGymUpdate);
routerAdmin.post('/adminUpdateGym',admin.adminUpdateGym);
routerAdmin.get('/adminGymBarcode/:gymId',admin.adminGymBarcode);
routerAdmin.post('/adminAddGymBarcode',admin.adminAddGymBarcode);
routerAdmin.get('/deleteGymByAdmin/:gymId/:gymManagerId',admin.deleteGymByAdmin);

//App Users
routerAdmin.get('/manageUsers', admin.manageUsers);
routerAdmin.get('/addUserByAdmin',admin.addUserByAdmin);
routerAdmin.post('/addNewUser',admin.addNewUser);
routerAdmin.get('/adminUserUpdate/:userId',admin.adminUserUpdate);
routerAdmin.post('/adminUpdateUser',admin.adminUpdateUser);
routerAdmin.get('/deleteUserByAdmin/:userId',admin.deleteUserByAdmin);
routerAdmin.post('/addCoinsForUser',admin.addCoinsForUser);

//CheckIn History
routerAdmin.get('/listUserCheckIns', admin.listUserCheckIns);

routerAdmin.get('/myProfile', admin.myProfile);

//Teammate
routerAdmin.get('/teammates',admin.teammates);
routerAdmin.get('/addTeammatesByAdmin',admin.addTeammatesByAdmin);
routerAdmin.post('/addNewTeammate',admin.addNewTeammate);
routerAdmin.get('/teammateUpdate/:teammateId',admin.teammateUpdate);
routerAdmin.post('/updateTeammate',admin.updateTeammate);
routerAdmin.get('/deleteTeammate/:teammateId',admin.deleteTeammate);

//SuperAdmin
routerAdmin.get('/superAdmins',admin.superAdmins);
routerAdmin.get('/addSuperAdminByAdmin',admin.addSuperAdminByAdmin);
routerAdmin.post('/addNewSuperAdmin',admin.addNewSuperAdmin);
routerAdmin.get('/superAdminUpdate/:superAdminId',admin.superAdminUpdate);
routerAdmin.post('/updateSuperAdmin',admin.updateSuperAdmin);
routerAdmin.get('/deleteSuperAdmin/:teammateId',admin.deleteSuperAdmin);

app.use(routerAdmin);

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