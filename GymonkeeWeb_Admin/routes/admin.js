var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var firebase = require('firebase');
const https = require("https");
var helper = require('sendgrid').mail;
var moment = require('moment');
var moment_timezone = require('moment-timezone');

var barcodeDir          = './public/barcodeimages/';

var constant = require('./constant');

var stripe = require("stripe")(constant.secretKey);
// var mandrill_Key = 'lIjcLFhixMfY3mQAR8DiZQ';// shraddha
var mandrill_Key = 'iprng0xQhNuJQFdR0_7J2w';// sujal sir account

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(mandrill_Key);

var filePath                = constant.file;
var config                  = constant.config;
var placeHolderImgUrl       = constant.placeHolderImgUrl;
var UserType_SuperAdmin     = constant.UserType_SuperAdmin;
var UserType_GymManager     = constant.UserType_GymManager;
var UserType_AdminTeammate  = constant.UserType_AdminTeammate;
var adminUrl                = constant.adminUrl;
var DENIED                  = constant.DENIED;
var CLOSED                  = constant.CLOSED;
var QUERY_LIMIT             = parseFloat(constant.QUERY_LIMIT);
var NET_TERMS_ARRAY         = constant.NET_TERMS_ARRAY;

//==================== Prelogin Section ====================

// Open index page(main login page)
exports.index = function(req, res){
    console.log("index called(admin.js)");
    res.render('admin/index');
};

//Login in admin web panel
exports.adminLogin = function(req, res){

    session = req.session;

    session.UserType_SuperAdmin = UserType_SuperAdmin;
    session.UserType_GymManager = UserType_GymManager;
    session.UserType_AdminTeammate = UserType_AdminTeammate;

    console.log("adminLogin(admin.js) called...");

    var username = req.body.username;
    var userpass = req.body.password;

    firebase.auth().signInWithEmailAndPassword(username,userpass).then(function (user) {
        console.log("adminLogin login success..."+user.uid);

        var database = firebase.database();
        var currentUserRef = database.ref('AdminUser').child(user.uid);

        console.log("currentUserRef : ",currentUserRef.toString());

        currentUserRef.once('value',function gotdata(data){
            console.log("data get from current user success..."+data.exists());

            if (data.exists())
            {
                var userData = data.val();
                var keys = Object.keys(userData);

                userData.uid = user.uid;

                session.currentUser = userData;

                console.log("keys : "+keys);
                console.log(userData);
                console.log("type : "+userData.type);

                // console.log(session.currentUser);
                // console.log("session.currentUser.type : "+session.currentUser.type);

                session.currentUser.fullname = userData.firstname + " " + userData.lastname;

                console.log("session.currentUser...");
                console.log(session.currentUser);

                if (userData.type === UserType_SuperAdmin || userData.type === UserType_AdminTeammate)
                {
                    if (userData.status === 0) {
                        req.flash('notify', session.currentUser.fullname + ' has been deleted by Super Admin' );
                        res.redirect('back');
                    }
                    else {
                        // firebase.auth().currentUser.getIdToken(/* forceRefresh */ true).then(function(idToken) {

                        //     console.log("idToken : "+idToken);

                        //     // Send token to your backend via HTTPS
                        //     // ...
                        // }).catch(function(error) {

                        //     console.log("error : "+error.message);

                        //     // Handle error
                        // });

                        // getUserData(true,'');

                        // getUserDataLast(true,'');

                        res.redirect('adminDashboard');
                    }
                }
                else {
                    req.flash('notify', 'Please Login with SuperAdmin user');
                    res.redirect('back');
                }
            }
            else
            {
                req.flash('notify', 'Please Login with SuperAdmin user');
                res.redirect('back');
            }
        },function errdata(err){
            console.log("error in get current user info...");
            console.log(err.message);
            req.flash('error', err.message);
            res.redirect(adminUrl);
        });
    }).catch(function(error) {
        console.log("error in login...");
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect(adminUrl);
    });
};

function getUserData(getFirst,lastKey) {

    console.log("getUserData called...",getFirst,lastKey);
    var database = firebase.database();
    var ref;// = database.ref('User');

    if (getFirst) {
        ref = database.ref('Gyms').limitToFirst(QUERY_LIMIT).orderByChild('status').equalTo(1);
    } else {
        ref = database.ref('Gyms').limitToFirst(QUERY_LIMIT + 1)/*.orderByChild('status').equalTo(1)*/.startAt(null,lastKey.slice(0,-1));
    }
    console.log("ref..."+ref.toString());

    ref.once('value',function gotdata(data){

        if (data.exists()) {

            var userData = data.val();
            var keys = Object.keys(userData);

            if (!getFirst) {
                keys.shift();
            }
            var last = keys[keys.length - 1];
            console.log("########## keys : ",keys,keys.length,last,(keys.length === QUERY_LIMIT));
            if (keys.length === QUERY_LIMIT) {
                // getUserData(last);
                getUserData(false,last);
            }
        } else {
            console.log("not exist...");
        }
    });
}

function getSubsriptionData() {
    console.log("getSubsriptionData called...");

    var userRef = firebase.database().ref('User');
    userRef.once('value', function gotdata(data) {

        if (data.exists()) {
            var user = data.val();
            var keys = Object.keys(user);

            // console.log("getSubsriptionData : User...",keys.length);
            // console.log(user);

            for (var i = 0; i < keys.length; i++) {
                var k = keys[i];

                if (user[k].subscriptionPlan) {
                    console.log(i,"##### i ...",k);
                    console.log(user[k].subscriptionPlan);

                    var newDict = {
                        planId : '',
                        subscriptionId : '',
                        planId_dev : user[k].subscriptionPlan.planId,
                        subscriptionId_dev : user[k].subscriptionPlan.subscriptionId,
                    }
                    console.log(newDict);

                    var userRef1 = firebase.database().ref('User/'+k+'/subscriptionPlan');
                    console.log("userRef1 : ",userRef1.toString());
                    // userRef1.update(newDict);
                }
            }
        }
    }, function errdata(err) {
        console.log("err...");
        console.log(err);
    });
}

//forgot password
exports.adminForgotPassword = function(req, res){
    console.log("adminForgotPassword(admin.js) called...");
    console.log(req.body);

    // sentEmailUsingMandrill();
    // return;

    var email = req.body.email;

    firebase.auth().sendPasswordResetEmail(email).then(function(user){
        console.log("Mail sent successfully...");
        req.flash('notify', 'Mail sent successfully...');
        res.redirect(adminUrl);
    }).catch(function(error){
        console.log("error in sendPasswordResetEmail...");
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect(adminUrl);
    });
};

//Logout from admin web panel
exports.adminLogout = function(req, res) {
    console.log("adminLogout(admin.js) called...");

    firebase.auth().signOut().then(function(){
        console.log("logout successfully...");
        req.session.currentUser = null;
        res.redirect(adminUrl);
    }).catch(function(err){
        console.log("adminLogout(admin.js) Error in logout : "+typeof(err.message));
        console.log(err);
        req.flash('error', err.message);
        if ((err.message).indexOf(DENIED) >= 0) {
            res.redirect(adminUrl);
        } else {
            res.redirect('back');
        }
    });
};

//==================== Dashboard Section ====================

// Open dashboard page
exports.adminDashboard = function(req, res){
    session = req.session;
    session.current = 'adminDashboard';
    //res.render('index');
    console.log("welcome to dashboard");
    // count user
    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    // getSubsriptionData();
    // return

    if (currentUser) {
        var database = firebase.database();
        var ref = database.ref('User').orderByChild('status').equalTo(1);
        ref.once('value', function gotdata(data) {

            if (data.exists())
            {
                var user = data.val();
                // console.log("********users......", user);
                var keys = Object.keys(user);
                var ttluser = 0;

                var curr = new Date; // get current date
                var mon = curr.getDate() - (curr.getDay() - 1); // First day is the day of the month - the day of the week

                var options = { year: '2-digit', month: '2-digit', day: '2-digit' };
                console.log("today :    "+curr.toLocaleString('en-US', options));

                var monday = new Date(curr.setDate(curr.getDate() - curr.getDay()+1));
                var tueday = new Date(curr.setDate(curr.getDate() - curr.getDay()+2));
                var wedday = new Date(curr.setDate(curr.getDate() - curr.getDay()+3));
                var thuday = new Date(curr.setDate(curr.getDate() - curr.getDay()+4));
                var friday = new Date(curr.setDate(curr.getDate() - curr.getDay()+5));
                var satday = new Date(curr.setDate(curr.getDate() - curr.getDay()+6));
                var sunday = new Date(curr.setDate(curr.getDate() - curr.getDay()+7));

                var mondayStr = monday.toDateString();
                var tuedayStr = tueday.toDateString();
                var weddayStr = wedday.toDateString();
                var thudayStr = thuday.toDateString();
                var fridayStr = friday.toDateString();
                var satdayStr = satday.toDateString();
                var sundayStr = sunday.toDateString();

                var mondayArray = [];
                var tuedayArray = [];
                var weddayArray = [];
                var thudayArray = [];
                var fridayArray = [];
                var satdayArray = [];
                var sundayArray = [];

                var WeeklyNewUserData = [];

                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];

                    //Only display App Users
                    if ((user[k].type !== UserType_GymManager) && (user[k].type !== UserType_SuperAdmin))
                    {
                        var createdAt = user[k]["createdAt"];

                        if (createdAt) {
                            var date = new Date(createdAt);
                            var dateStr = date.toDateString();

                            // console.log(i+"##### email : " + user[k]["email"]);
                            // console.log("dateStr : " + dateStr);

                            if (dateStr === mondayStr) {
                                mondayArray.push(user[k]);
                            } else if (dateStr === tuedayStr) {
                                tuedayArray.push(user[k]);
                            } else if (dateStr === weddayStr) {
                                weddayArray.push(user[k]);
                            } else if (dateStr === thudayStr) {
                                thudayArray.push(user[k]);
                            } else if (dateStr === fridayStr) {
                                fridayArray.push(user[k]);
                            } else if (dateStr === satdayStr) {
                                satdayArray.push(user[k]);
                            } else if (dateStr === sundayStr) {
                                sundayArray.push(user[k]);
                            }
                        }
                        ttluser = ttluser + 1;
                    }
                }

                // console.log("mondayArray : " + mondayArray.length);
                // console.log("tuedayArray : " + tuedayArray.length);
                // console.log("weddayArray : " + weddayArray.length);
                // console.log("thudayArray : " + thudayArray.length);
                // console.log("fridayArray : " + fridayArray.length);
                // console.log("satdayArray : " + satdayArray.length);
                // console.log("sundayArray : " + sundayArray.length);

                var monDict = {
                    "date": mondayStr,//monday.getDate() + '-' + (monday.getMonth()) + '-' + monday.getFullYear(),
                    "register": mondayArray.length
                };
                WeeklyNewUserData.push(monDict);

                var tueDict = {
                    "date": tuedayStr,//tueday.getDate() + '-' + (tueday.getMonth()) + '-' + tueday.getFullYear(),
                    "register": tuedayArray.length
                };
                WeeklyNewUserData.push(tueDict);

                var wedDict = {
                    "date": weddayStr,//wedday.getDate() + '-' + (wedday.getMonth()) + '-' + wedday.getFullYear(),
                    "register": weddayArray.length
                };
                WeeklyNewUserData.push(wedDict);

                var thuDict = {
                    "date": thudayStr,//thuday.getDate() + '-' + (thuday.getMonth()) + '-' + thuday.getFullYear(),
                    "register": thudayArray.length
                };
                WeeklyNewUserData.push(thuDict);

                var friDict = {
                    "date": fridayStr,//friday.getDate() + '-' + (friday.getMonth()) + '-' + friday.getFullYear(),
                    "register": fridayArray.length
                };
                WeeklyNewUserData.push(friDict);

                var satDict = {
                    "date": satdayStr,//satday.getDate() + '-' + (satday.getMonth()) + '-' + satday.getFullYear(),
                    "register": satdayArray.length
                };
                WeeklyNewUserData.push(satDict);

                var sunDict = {
                    "date": sundayStr,//sunday.getDate() + '-' + (sunday.getMonth()) + '-' + sunday.getFullYear(),
                    "register": sundayArray.length
                };
                WeeklyNewUserData.push(sunDict);

                console.log("TotalUser", ttluser);

                // GymCount
                var ref2 = database.ref('Gyms').orderByChild('status').equalTo(1);
                ref2.once('value', function gotdata(data) {

                    if (data.exists())
                    {
                        var user = data.val();
                        var gymsKeys = Object.keys(user);

                        var gymCheckInUsers = [];

                        var curr = new Date; // get current date

                        console.log("curr : "+curr+" year : "+curr.getFullYear());
                        /*
                        console.log("curr toDateString() : "+curr.toDateString());
                        console.log("curr toLocaleString() : "+curr.toLocaleString());
                        */

                        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
                        /*
                        var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                        // var options1 = { year: '2-digit', month: '2-digit', day: '2-digit' };
                        var options1 = { weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit' };
                        var options2 = { weekday: 'narrow', year: '2-digit', month: 'short', day: '2-digit' };

                        console.log(curr.toLocaleString('en-US', options));
                        console.log(curr.toLocaleString('en-US', options1));
                        console.log(curr.toLocaleString('en-US', options1).replace(',',''));
                        console.log(curr.toLocaleString('en-US', options2));
                        */

                        var mon = curr.getDate() - (curr.getDay() - 1); // First day is the day of the month - the day of the week

                        var monday = new Date(curr.setDate(curr.getDate() - curr.getDay()+1));
                        var tueday = new Date(curr.setDate(curr.getDate() - curr.getDay()+2));
                        var wedday = new Date(curr.setDate(curr.getDate() - curr.getDay()+3));
                        var thuday = new Date(curr.setDate(curr.getDate() - curr.getDay()+4));
                        var friday = new Date(curr.setDate(curr.getDate() - curr.getDay()+5));
                        var satday = new Date(curr.setDate(curr.getDate() - curr.getDay()+6));
                        var sunday = new Date(curr.setDate(curr.getDate() - curr.getDay()+7));

                        var mondayStr = monday.toDateString();
                        var tuedayStr = tueday.toDateString();
                        var weddayStr = wedday.toDateString();
                        var thudayStr = thuday.toDateString();
                        var fridayStr = friday.toDateString();
                        var satdayStr = satday.toDateString();
                        var sundayStr = sunday.toDateString();

                        var mondayArray = [];
                        var tuedayArray = [];
                        var weddayArray = [];
                        var thudayArray = [];
                        var fridayArray = [];
                        var satdayArray = [];
                        var sundayArray = [];

                        var mondayCoins = 0;
                        var tuedayCoins = 0;
                        var weddayCoins = 0;
                        var thudayCoins = 0;
                        var fridayCoins = 0;
                        var satdayCoins = 0;
                        var sundayCoins = 0;

                        var janArray = [];
                        var febArray = [];
                        var marchArray = [];
                        var aprArray = [];
                        var mayArray = [];
                        var juneArray = [];
                        var julyArray = [];
                        var augArray = [];
                        var sepArray = [];
                        var octArray = [];
                        var novArray = [];
                        var decArray = [];

                        var WeeklyCheckInData = [];
                        var yearlyNewGymData = [];

                        for (var i = 0; i < gymsKeys.length; i++) {
                            var gymId = gymsKeys[i];
                            var gym = user[gymId];

                            console.log(i+"##### "+gymId+" ,name : "+gym.name+" ,createdAt : "+gym.createdAt);

                            if (gym.createdAt) {
                                var createdAt = new Date(gym.createdAt);

                                var createdAtStr = createdAt.toDateString();
                                var month = (createdAt.getMonth() + 1);
                                var year = createdAt.getFullYear();

                                console.log("createdAtStr : " + createdAtStr+" ,month : "+month+" ,year : "+year);

                                if (curr.getFullYear() === year) {
                                    if (month === 1) {
                                        janArray.push(gym);
                                    }
                                    else if (month === 2) {
                                        febArray.push(gym);
                                    }
                                    else if (month === 3) {
                                        marchArray.push(gym);
                                    }
                                    else if (month === 4) {
                                        aprArray.push(gym);
                                    }
                                    else if (month === 5) {
                                        mayArray.push(gym);
                                    }
                                    else if (month === 6) {
                                        juneArray.push(gym);
                                    }
                                    else if (month === 7) {
                                        julyArray.push(gym);
                                    }
                                    else if (month === 8) {
                                        augArray.push(gym);
                                    }
                                    else if (month === 9) {
                                        sepArray.push(gym);
                                    }
                                    else if (month === 10) {
                                        octArray.push(gym);
                                    }
                                    else if (month === 11) {
                                        novArray.push(gym);
                                    }
                                    else if (month === 12) {
                                        decArray.push(gym);
                                    }
                                }
                            }
                            var gymCheckIns = gym["Users"];

                            if (gymCheckIns)
                            {
                                var gymCheckInsKeys = Object.keys(gymCheckIns);

                                // console.log("gymCheckInsKeys : " + gymCheckInsKeys);
                                var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

                                console.log("timezone : " + timezone);

                                for (var j = 0; j < gymCheckInsKeys.length; j++) {
                                    var dict = gymCheckIns[gymCheckInsKeys[j]];

                                    // console.log("dict..."+j);
                                    // console.log(dict.gymCoins);

                                    var dateTime = dict["dateTime"];
                                    var gymCoins = parseFloat(dict.gymCoins);

                                    if (dateTime) {
                                        var date = new Date(dict["dateTime"]);
                                        var dateStr = date.toDateString();
                                        // console.log(j+"##### dateStr : "+dateStr+" , gymCoins : "+gymCoins+" , isNaN : "+(!(isNaN(gymCoins))));

                                        if (dict.checkInStatus === 2) {
                                            gymCheckInUsers.push(dict);

                                            if (dateStr === mondayStr) {
                                                mondayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Mon gymCoins : "+gymCoins);
                                                    mondayCoins += gymCoins;
                                                }
                                            } else if (dateStr === tuedayStr) {
                                                tuedayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Tue gymCoins : "+gymCoins);
                                                    tuedayCoins += gymCoins;
                                                }
                                            } else if (dateStr === weddayStr) {
                                                weddayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Wed gymCoins : "+gymCoins);
                                                    weddayCoins += gymCoins;
                                                }
                                            } else if (dateStr === thudayStr) {
                                                thudayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Thu gymCoins : "+gymCoins);
                                                    thudayCoins += gymCoins;
                                                }
                                            } else if (dateStr === fridayStr) {
                                                fridayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Fri gymCoins : "+gymCoins);
                                                    fridayCoins += gymCoins;
                                                }
                                            } else if (dateStr === satdayStr) {
                                                satdayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Sat gymCoins : "+gymCoins);
                                                    satdayCoins += gymCoins;
                                                }
                                            } else if (dateStr === sundayStr) {
                                                sundayArray.push(dict);
                                                if (!(isNaN(gymCoins))) {
                                                    // console.log(i+" ,j : "+j+"@@@@@Sun gymCoins : "+gymCoins);
                                                    sundayCoins += gymCoins;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        /*
                        console.log("mondayArray : " + mondayArray.length+" , mondayCoins : "+mondayCoins);
                        console.log("tuedayArray : " + tuedayArray.length+" , tuedayCoins : "+tuedayCoins);
                        console.log("weddayArray : " + weddayArray.length+" , weddayCoins : "+weddayCoins);
                        console.log("thudayArray : " + thudayArray.length+" , thudayCoins : "+thudayCoins);
                        console.log("fridayArray : " + fridayArray.length+" , fridayCoins : "+fridayCoins);
                        console.log("satdayArray : " + satdayArray.length+" , satdayCoins : "+satdayCoins);
                        console.log("sundayArray : " + sundayArray.length+" , sundayCoins : "+sundayCoins);
                        */

                        var monDict = {
                            "date": monday.toLocaleString('en-US', options).replace(',',''),//mondayStr,//monday.getDate() + '-' + (monday.getMonth()) + '-' + monday.getFullYear(),
                            "checkIn": mondayArray.length,
                            "coins" : mondayCoins
                        };
                        WeeklyCheckInData.push(monDict);

                        var tueDict = {
                            "date": tueday.toLocaleString('en-US', options).replace(',',''),//tuedayStr,//tueday.getDate() + '-' + (tueday.getMonth()) + '-' + tueday.getFullYear(),
                            "checkIn": tuedayArray.length,
                            "coins" : tuedayCoins
                        };
                        WeeklyCheckInData.push(tueDict);

                        var wedDict = {
                            "date": wedday.toLocaleString('en-US', options).replace(',',''),//weddayStr,//wedday.getDate() + '-' + (wedday.getMonth()) + '-' + wedday.getFullYear(),
                            "checkIn": weddayArray.length,
                            "coins" : weddayCoins
                        };
                        WeeklyCheckInData.push(wedDict);

                        var thuDict = {
                            "date": thuday.toLocaleString('en-US', options).replace(',',''),//thudayStr,//thuday.getDate() + '-' + (thuday.getMonth()) + '-' + thuday.getFullYear(),
                            "checkIn": thudayArray.length,
                            "coins" : thudayCoins
                        };
                        WeeklyCheckInData.push(thuDict);

                        var friDict = {
                            "date": friday.toLocaleString('en-US', options).replace(',',''),//fridayStr,//friday.getDate() + '-' + (friday.getMonth()) + '-' + friday.getFullYear(),
                            "checkIn": fridayArray.length,
                            "coins" : fridayCoins
                        };
                        WeeklyCheckInData.push(friDict);

                        var satDict = {
                            "date": satday.toLocaleString('en-US', options).replace(',',''),//satdayStr,//satday.getDate() + '-' + (satday.getMonth()) + '-' + satday.getFullYear(),
                            "checkIn": satdayArray.length,
                            "coins" : satdayCoins
                        };
                        WeeklyCheckInData.push(satDict);

                        var sunDict = {
                            "date": sunday.toLocaleString('en-US', options).replace(',',''),//sundayStr,//sunday.getDate() + '-' + (sunday.getMonth()) + '-' + sunday.getFullYear(),
                            "checkIn": sundayArray.length,
                            "coins" : sundayCoins
                        };
                        WeeklyCheckInData.push(sunDict);

                        console.log("janArray : "+janArray.length);
                        console.log("febArray : "+febArray.length);
                        console.log("marchArray : "+marchArray.length);
                        console.log("aprArray : "+aprArray.length);
                        console.log("mayArray : "+mayArray.length);
                        console.log("juneArray : "+juneArray.length);
                        console.log("julyArray : "+julyArray.length);
                        console.log("augArray : "+augArray.length);
                        console.log("sepArray : "+sepArray.length);
                        console.log("octArray : "+octArray.length);
                        console.log("novArray : "+novArray.length);
                        console.log("decArray : "+decArray.length);

                        var janDict = {
                            "month" : 'Jan',
                            "gyms" : janArray.length
                        };
                        yearlyNewGymData.push(janDict);

                        var febDict = {
                            "month" : 'Feb',
                            "gyms" : febArray.length
                        };
                        yearlyNewGymData.push(febDict);

                        var marDict = {
                            "month" : 'Mar',
                            "gyms" : marchArray.length
                        };
                        yearlyNewGymData.push(marDict);

                        var aprDict = {
                            "month" : 'Apr',
                            "gyms" : aprArray.length
                        };
                        yearlyNewGymData.push(aprDict);

                        var mayDict = {
                            "month" : 'May',
                            "gyms" : mayArray.length
                        };
                        yearlyNewGymData.push(mayDict);

                        var junDict = {
                            "month" : 'Jun',
                            "gyms" : juneArray.length
                        };
                        yearlyNewGymData.push(junDict);

                        var julDict = {
                            "month" : 'Jul',
                            "gyms" : julyArray.length
                        };
                        yearlyNewGymData.push(julDict);

                        var augDict = {
                            "month" : 'Aug',
                            "gyms" : augArray.length
                        };
                        yearlyNewGymData.push(augDict);

                        var septDict = {
                            "month" : 'Sept',
                            "gyms" : sepArray.length
                        };
                        yearlyNewGymData.push(septDict);

                        var octDict = {
                            "month" : 'Oct',
                            "gyms" : octArray.length
                        };
                        yearlyNewGymData.push(octDict);

                        var novDict = {
                            "month" : 'Nov',
                            "gyms" : novArray.length
                        };
                        yearlyNewGymData.push(novDict);

                        var decDict = {
                            "month" : 'Dec',
                            "gyms" : decArray.length
                        };
                        yearlyNewGymData.push(decDict);

                        console.log("TotalGym", gymsKeys.length);

                        var dashboardDict = {
                            totalGyms: gymsKeys.length,
                            totalUsers: ttluser,
                            gymCheckInUsers : gymCheckInUsers.length,
                            weeklyCheckIn: WeeklyCheckInData,
                            weeklyNewUsers : WeeklyNewUserData,
                            yearlyNewGyms : yearlyNewGymData
                        };
                        console.log(dashboardDict);

                        res.render('admin/dashboard', dashboardDict);
                    }
                    else {
                        var dashboardDict = {
                            totalGyms: 0,
                            totalUsers: ttluser,
                            gymCheckInUsers : 0,
                            weeklyCheckIn: [],
                            weeklyNewUsers : [],
                            yearlyNewGyms : []
                        };
                        console.log(dashboardDict);

                        res.render('admin/dashboard', dashboardDict);
                    }
                }, function errdata(err) {
                    console.log("adminDashboard(admin.js) Error in get gym data : "+typeof(err.message));
                    console.log(err);
                    req.flash('error', err.message);
                    if ((err.message).indexOf(DENIED) >= 0) {
                        res.redirect(adminUrl);
                    } else {
                        res.redirect('back');
                    }
                });
            }
            else
            {
                var dashboardDict = {
                    totalGyms: 0,
                    totalUsers: 0,
                    gymCheckInUsers : 0,
                    weeklyCheckIn: [],
                    weeklyNewUsers : [],
                    yearlyNewGyms : []
                };
                console.log(dashboardDict);

                res.render('admin/dashboard', dashboardDict);
            }
        }, function errdata(err) {
            console.log("adminDashboard(admin.js) Error in get user data : "+typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

//Open Change password page
exports.adminChangePassword = function(req, res){
    console.log("adminChangePassword(admin.js) called...");
    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);
    //https://firebase.google.com/docs/auth/web/manage-users
    if (currentUser) {
        res.render('admin/changePasswordByAdmin');
    }
    else {
        res.redirect(adminUrl);
    }
};

//Change admin password
exports.adminUpdatePassword = function(req, res){
    console.log("adminUpdatePassword(admin.js) called...");

    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);
    //https://firebase.google.com/docs/auth/web/manage-users
    if (currentUser) {

        console.log("firebase.auth().currentUser : "+firebase.auth().currentUser);

        if (firebase.auth().currentUser) {
            firebase.auth().currentUser.updatePassword(req.body.new_password).then(function () {
                // Update successful.
                console.log("updatePassword successfully...");

                // res.redirect('/dashboard');

                req.flash('notify', 'Your Password has been changed!');
                res.redirect('/adminChangePassword');

            }).catch(function (err) {
                console.log("adminUpdatePassword(admin.js) Error in update password : " + typeof(err.message));
                console.log(err);
                req.flash('error', err.message);
                if ((err.message).indexOf(DENIED) >= 0) {
                    res.redirect(adminUrl);
                } else {
                    res.redirect('back');
                }
            });
        }
        else {
            res.redirect(adminUrl);
        }
    }
    else {
        res.redirect(adminUrl);
    }
};

//==================== Gym Section ====================

// List of available gyms
exports.manageGym = function(req, res){
    session = req.session;
    session.current = 'adminGym';

    //res.render('index');
    // vajid changes
    console.log("manage Gym called .....");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var database = firebase.database();
        var ref = database.ref('Gyms').orderByChild('status').equalTo(1);
        ref.once('value', function gotdata(data) {

            if (data.exists()) {
                // console.log(data.val());
                var user = data.val();
                var keys = Object.keys(user);
                console.log(keys);

                var gymData = [];

                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];

                    // console.log(k+"##### i..."+i);

                    var createdAtDate = new Date(user[k].createdAt);

                    console.log(user[k].name+"@@@@@ gym : "+createdAtDate.toString());

                    if (user[k].img === undefined)
                    {
                        user[k].coverImage = "";
                    }
                    else if (user[k].img.length > 0)
                    {
                        user[k].coverImage = user[k].img[0]
                    }
                    else {
                        user[k].coverImage = "";
                    }

                    user[k].name = ((user[k].name === undefined) ? 'N/A' : user[k].name);

                    user[k].address = ((user[k].address === undefined) ? 'N/A' : user[k].address);

                    user[k].hoursOfOperation = ((user[k].hoursOfOperation === undefined) ? '0' : user[k].hoursOfOperation);

                    user[k].coins = ((user[k].coins === undefined) ? '0' : user[k].coins);

                    user[k].coinBalance = ((user[k].coinBalance === undefined) ? '0' : user[k].coinBalance);

                    user[k].avgRate = ((user[k].avgRate === undefined) ? '0.00' : parseFloat(Math.round(user[k].avgRate * 100) / 100).toFixed(2));

                    user[k].gymManagerName = ((user[k].gymManager === undefined) ? 'N/A': ((user[k].gymManager.name === undefined) ? 'N/A' : user[k].gymManager.name));

                    user[k].gymManagerEmail = ((user[k].gymManager === undefined) ? 'N/A': ((user[k].gymManager.email === undefined) ? 'N/A' : user[k].gymManager.email));

                    user[k].gymManagerId = ((user[k].gymManager === undefined) ? 'no': ((user[k].gymManager.id === undefined) ? 'no' : user[k].gymManager.id));

                    user[k].gymId = k;

                    gymData.push(user[k]);
                }

                gymData.sort(function(a, b){
                    if(a.createdAt < b.createdAt) return -1;
                    if(a.createdAt > b.createdAt) return 1;
                    return 0;
                });
                gymData.reverse();

                res.render('admin/manageGym', {result: gymData});
            }
            else {

                var gymData = [];

                res.render('admin/manageGym', {result: gymData});
            }

        }, function errdata(err) {
            console.log("manageGym(admin.js) Error in get gym data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {

        res.redirect(adminUrl);
    }
};

//Open add gym page
exports.addGym = function(req, res){

    console.log("addGym(admin.js) called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var fromArray = constant.fromArray;
        var toArray = constant.toArray;
        var servicesArray = constant.servicesArray;
        var maxImageSize = constant.maxImageSize;

        console.log("fromArray..." + fromArray);
        console.log("toArray..." + toArray);
        console.log("servicesArray..." + servicesArray);
        console.log("managerGym(user.js) called...");

        res.render('admin/addGym', {from: fromArray, to: toArray, services: servicesArray, maxImageSize: maxImageSize});
    } else {
        res.redirect(adminUrl);
    }
};

// Open update gym page
exports.adminGymUpdate = function(req, res){

    var fromArray = constant.fromArray;
    var toArray = constant.toArray;
    var servicesArray = constant.servicesArray;
    var termsArray = constant.NET_TERMS_ARRAY;
    var maxImageSize = constant.maxImageSize;

    console.log("fromArray..."+fromArray);
    console.log("toArray..."+toArray);
    console.log("servicesArray..."+servicesArray);
    console.log("termsArray..."+termsArray);

    var gymId = req.params.gymId;

    console.log("adminGymUpdate(admin.js) called..."+gymId);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : "+currentUserId);

        var database = firebase.database();

        var gymRef = database.ref('Gyms').child(gymId);

        console.log("gymRef : ",gymRef.toString());

        gymRef.once('value',function gotdata(gymData){

            if (gymData.exists()) {
                var gymDataVal = gymData.val();
                var gymKeys = Object.keys(gymDataVal);

                console.log("gymKeys : " + gymKeys);

                var gymInfo = gymDataVal;
                gymInfo.id = gymId;

                console.log(gymInfo);

                gymInfo.name = ((gymInfo.name === undefined) ? 'N/A' : gymInfo.name);
                gymInfo.address = ((gymInfo.address === undefined) ? 'N/A' : gymInfo.address);
                gymInfo.hoursOfOperation = ((gymInfo.hoursOfOperation === undefined) ? 'N/A' : gymInfo.hoursOfOperation);
                gymInfo.coins = ((gymInfo.coins === undefined) ? '0' : gymInfo.coins);
                gymInfo.Services = ((gymInfo.Services === undefined) ? [] : gymInfo.Services);
                gymInfo.img = ((gymInfo.img === undefined) ? [] : gymInfo.img);
                gymInfo.pdf = ((gymInfo.pdf === undefined) ? [] : gymInfo.pdf);
                gymInfo.gymBarCode = ((gymInfo.gymBarCode === undefined) ? 'N/A' : gymInfo.gymBarCode);
                gymInfo.gymManagerName = ((gymInfo.gymManager === undefined) ? '' : ((gymInfo.gymManager.name === undefined) ? '' : gymInfo.gymManager.name));
                gymInfo.gymManagerId = ((gymInfo.gymManager === undefined) ? 'no' : ((gymInfo.gymManager.id === undefined) ? 'no' : gymInfo.gymManager.id));
                gymInfo.gymManagerEmail = ((gymInfo.gymManager === undefined) ? 'no' : ((gymInfo.gymManager.email === undefined) ? 'no' : gymInfo.gymManager.email));
                gymInfo.city = ((gymInfo.city === undefined) ? '' : gymInfo.city);
                gymInfo.state = ((gymInfo.state === undefined) ? '' : gymInfo.state);
                gymInfo.zipcode = ((gymInfo.zipcode === undefined) ? '' : gymInfo.zipcode);

                var gymMgrRef = database.ref('User/'+gymInfo.gymManagerId+'/stripe_connect_account_id');
                console.log("gymMgrRef : ",gymMgrRef.toString());

                gymMgrRef.once('value',function gotdata(gymMgrData){
                    if (gymMgrData.exists()) {
                        console.log("gymMgrData stripe_cust_id...");
                        console.log(gymMgrData.val());
                        gymInfo.gymManagerStripeConnectId = gymMgrData.val();
                    }
                    for (var i = 0; i < gymInfo.hoursOfOperation.length; i++)
                    {
                        var hours = gymInfo.hoursOfOperation[i];
                        var hoursKey = hours.split(' ')[0];
                        var indexOf = hours.indexOf('-');
                        var from = hours.substring((indexOf - 8),indexOf).trim();
                        var to = hours.substring((indexOf + 1),hours.length).trim();

                        if (hours.indexOf(CLOSED) >= 0) {
                            gymInfo[hoursKey+'_'+CLOSED] = '1';
                        } else {
                            gymInfo[hoursKey+'_'+CLOSED] = '0';
                            gymInfo[hoursKey+'_from'] = from;
                            gymInfo[hoursKey+'_to'] = to;
                        }

                        // console.log("##### hours : "+hours);
                        // console.log("hoursKey : "+hoursKey);
                        // console.log("indexOf : "+indexOf);
                        // console.log("from : "+from);
                        // console.log("to : "+to);

                        /*if (hours.indexOf('Wed') >= 0)
                        {
                            console.log(i+"@Wed : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }
                        else if (hours.indexOf('Thu') >= 0)
                        {
                            console.log(i+"@Wed : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }
                        else if (hours.indexOf('Fri') >= 0)
                        {
                            console.log(i+"@Fri : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }
                        else if (hours.indexOf('Sat') >= 0)
                        {
                            console.log(i+"@Sat : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }
                        else if (hours.indexOf('Sun') >= 0)
                        {
                            console.log(i+"@Sun : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }
                        else if (hours.indexOf('Mon') >= 0)
                        {
                            console.log(i+"@Mon : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }
                        else if (hours.indexOf('Tue') >= 0)
                        {
                            console.log(i+"@Tue : "+hours);
                            console.log("from : "+from+" ,to : "+to);
                        }*/
                    }
                    console.log("gymInfo...");
                    console.log(gymInfo);
                    res.render('admin/updateGym',{from : fromArray,to : toArray,services : servicesArray, gym : gymInfo ,maxImageSize : maxImageSize ,terms : termsArray});
                });
            }
            // res.render('addGym', gymInfo);

        },function errdata(err){
            console.log("manageGym(admin.js) Error in get gym data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

//Add coins & barcode to gym page open
exports.adminGymBarcode = function(req, res){

    var gymId = req.params.gymId;

    console.log("adminGymBarcode(admin.js) called..."+gymId);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : "+currentUserId);

        var database = firebase.database();

        var gymRef = database.ref('Gyms').child(gymId);

        console.log("gymRef : ",gymRef.toString());

        gymRef.once('value',function gotdata(gymData){

            if (gymData.exists()) {

                var gymDataVal = gymData.val();
                var gymKeys = Object.keys(gymDataVal);

                console.log("gymKeys : " + gymKeys);

                var gymInfo = gymDataVal;
                gymInfo.id = gymId;

                console.log(gymInfo);

                gymInfo.name = ((gymInfo.name === undefined) ? '' :gymInfo.name);

                res.render('admin/barcodeGym', gymInfo);
            }
            else
            {
                res.redirect('/manageGym');
            }
        },function errdata(err){
            console.log("manageGym(admin.js) Error in get gym data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

function generateBuffer(type,count,digits,gymId,checkInCoins,pushGymId,isLast,res,req) {

    // console.log("generateBuffer i : "+count);

    const bwipjs = require('bwip-js');

    // console.log("bwipjs...");
    // console.log(bwipjs);

    //https://www.npmjs.com/package/bwip-js
    //0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ
    var rString = randomString(digits, '0123456789');
    console.log("rString : "+rString);

    bwipjs.toBuffer({
        bcid: type,       // Barcode type
        // text: '01234567890123456789ABCD',    // Text to encode
        text : rString,
        // alttext : rString,
        scale: 3,               // 3x scaling factor
        height: 10,              // Bar height, in millimeters
        includetext: true,            // Show human-readable text
        textxalign: 'center' ,  // Always good to set this
        // backgroundcolor : 'red'
    }, function (err, png) {
        // `png` is a Buffer
        // png.length           : PNG file length
        // png.readUInt32BE(16) : PNG image width
        // png.readUInt32BE(20) : PNG image height

        if (err) {
            console.log(err);
            //    Code 39 must contain only digits, capital letters, spaces and the symbols -.$/+%
        } else {
            // var img = type+'_'+count+'_'+gymId+'_'+rString+'.png';

            if (!fs.existsSync(barcodeDir)){
                fs.mkdirSync(barcodeDir);
            }

            var img = rString+'.png';
            var imgPath = barcodeDir + img;

            console.log('img : '+img+" , imgPath : "+imgPath);

            fs.writeFile(imgPath, png, 'binary', function (err) {
                if (err) throw err;
                console.log('File saved...'+imgPath);

                if(img !== "")
                {
                    var storage = require('@google-cloud/storage');

                    var gcs = storage({
                        projectId: config.projectId,
                        keyFilename: filePath
                    });

                    var bucket = gcs.bucket(config.storageBucket);
                    console.log("imgPath : "+imgPath);

                    bucket.upload(imgPath, { destination: "GymBarcode/"+gymId+'/'+img,public:true,metadata: {contentType: 'image/png'} }, function(err, file) {
                        if (!err) {
                            console.log("AFTER UPLOAD RETURN..."+file.name);
                            img = file.name;
                            console.log("filename : "+img);
                            var publicURL = createPublicFileURL(img);
                            console.log("publicURL : "+publicURL);

                            var database = firebase.database();

                            var gymRef = database.ref('Gyms').child(gymId).child('Barcodes');

                            console.log("gymRef : " + gymRef.toString());

                            var serverTime = firebase.database.ServerValue.TIMESTAMP;

                            var gymTransactionDict = {
                                barcodeURL : publicURL,
                                barcodeVal : rString,
                                status: 0,
                                createdAt: serverTime,
                                createdBy: req.session.currentUser.uid,
                                coinValue : checkInCoins,
                                gymTrxId : pushGymId
                            };

                            gymRef.push(gymTransactionDict).then(function (gym) {

                                console.log("Barcodes added successfully...");
                                // console.log(gym);

                                if (isLast)
                                {
                                    res.redirect('/manageGym');
                                }

                            }, function (error) {
                                console.log("error in push Barcodes...");
                                console.log(error.message);
                            });

                        } else {
                            res.send(err);
                        }
                    });

                    function createPublicFileURL(storageName) {
                        console.log("STORAGE NAME..."+storageName);

                        return 'http://storage.googleapis.com/'+config.storageBucket+'/'+storageName;
                    }
                }
            });
        }
    });
}

function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

// Add coins & barcode
exports.adminAddGymBarcode = function(req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("adminAddGymBarcode(admin.js) called...");
    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : " + currentUserId);

        var totalCoins = parseFloat(req.body.totalCoins);
        var checkInCoins = parseFloat(req.body.checkInCoins);

        if ((!isNaN(totalCoins)) && (!isNaN(checkInCoins))) {

            var totalBarcodes = 250; //freeEvent == 1 => the add 100 barcodes

            // console.log("req.body.freeEvent : "+req.body.freeEvent);
            // console.log(req.body.freeEvent === '0');
            // console.log(req.body.freeEvent === undefined);
            // console.log((req.body.freeEvent === '0') || (req.body.freeEvent === undefined));

            if ((req.body.freeEvent === '0') || (req.body.freeEvent === undefined)) {
                totalBarcodes = (totalCoins / checkInCoins);
            }
            var finalBarcodes = Math.round(totalBarcodes);

            console.log("totalBarcodes : " + totalBarcodes + " , finalBarcodes : " + finalBarcodes);

            var database = firebase.database();

            var gymRef = database.ref('Gyms').child(req.body.gymId);

            gymRef.once('value', function gotdata(data) {

                if (data.exists()) {

                    var gymData = data.val();
                    var keys = Object.keys(gymData);

                    var Barcodes = gymData.Barcodes;
                    if (Barcodes) {
                        var BarcodesKeys = Object.keys(Barcodes);

                        console.log("Barcodes..." + BarcodesKeys.length + " ,BarcodesKeys : " + BarcodesKeys);

                        for (var i = 0; i < BarcodesKeys.length; i++) {
                            var dict = Barcodes[BarcodesKeys[i]];

                            if (dict.status === 0) {
                                var barcodeRef = database.ref('Gyms').child(req.body.gymId).child('Barcodes').child(BarcodesKeys[i]);
                                console.log(BarcodesKeys[i] + "########## i" + i);
                                console.log(barcodeRef.toString());
                                console.log(dict);
                                barcodeRef.update({status: -1, isDeleted: true});
                            }
                        }
                    }
                    var gymRef = database.ref('Gyms').child(req.body.gymId).child('GymTransaction');

                    console.log("gymRef : " + gymRef.toString());

                    var gymTransactionDict = {
                        checkinCoins: checkInCoins,
                        totalCoins: totalCoins,
                        totalBarcodes: finalBarcodes,
                        status: 1,
                        createdAt: serverTime,
                        createdBy: req.session.currentUser.uid,
                        updatedAt : serverTime,
                        updatedBy : req.session.currentUser.uid
                    };

                    var gymCoins = database.ref('Gyms').child(req.body.gymId);

                    console.log("gymCoins : " + gymCoins.toString());

                    gymCoins.update({coins : checkInCoins});

                    gymRef.push(gymTransactionDict).then(function (gym) {

                        console.log("GymTransaction added successfully...");

                        var gymRefArray = gym.path.pieces_;
                        var pushGymId = gymRefArray[gymRefArray.length - 1];
                        console.log("user CheckIn ref : ",gymRefArray,gymRefArray.length);
                        console.log("pushGymId : ",pushGymId);

                        database.ref('Gyms').child(req.body.gymId).update({coinBalance : totalCoins});

                        var counter = 0;
                        var cnt = 0;
                        for (var i= 1 ; i <= finalBarcodes ; i++) {

                            var isLast = false;

                            if (i === finalBarcodes)
                            {
                                isLast = true;
                            }

                            console.log("isLast : "+isLast+" , (i === finalBarcodes) : "+(i === finalBarcodes));

                            // console.log("i : "+i);
                            counter = counter+1;
                            setTimeout(function() {
                                generateBuffer('upca',cnt,11,req.body.gymId,checkInCoins,pushGymId,isLast,res,req);
                                cnt = cnt + 1;
                            }, 30 * counter)
                        }

                        // res.redirect('/manageGym');

                    }, function (err) {
                        console.log("adminAddGymBarcode(admin.js) Error in push data : "+typeof(err.message));
                        console.log(err);
                        req.flash('error', err.message);
                        if ((err.message).indexOf(DENIED) >= 0) {
                            res.redirect(adminUrl);
                        } else {
                            res.redirect('back');
                        }
                    });
                }
                else {
                    res.redirect('back');
                }
            }, function errdata(err) {
                console.log("adminAddGymBarcode(admin.js) Error in get gym data : " + typeof(err.message));
                console.log(err);
                req.flash('error', err.message);
                if ((err.message).indexOf(DENIED) >= 0) {
                    res.redirect(adminUrl);
                } else {
                    res.redirect('back');
                }
            });
        }
        else
        {
            req.flash('error', 'Invalid coins');
            res.redirect('back');
        }
    }
    else {
        res.redirect(adminUrl);
    }
};

//Delete Gym
exports.deleteGymByAdmin = function(req, res){

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var serverTime = firebase.database.ServerValue.TIMESTAMP;

        var gymId = req.params.gymId;
        var gymManagerId = req.params.gymManagerId;

        console.log("deleteGymByAdmin(admin.js) called..." + gymId + " ,gymManagerId : " + gymManagerId);

        var database = firebase.database();

        var gymRef = database.ref('Gyms').child(gymId);

        console.log("gymRef...", gymRef.toString());

        var userRef = database.ref('User').child(gymManagerId);

        console.log("userRef...", userRef.toString());

        var updateDict = {
            status: 0,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        };

        var updateDict1 = {
            status: 1,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        };

        console.log("updateDict...");
        console.log(updateDict);

        gymRef.update(updateDict);
        userRef.child('gym').update(updateDict);
        // userRef.update(updateDict1);

        req.flash('notify', 'Gym has been deleted!');
        res.redirect('/manageGym');
    } else {
        res.redirect(adminUrl);
    }
};

// Add new gym in system
exports.addNewGym = function (req,res) {

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var serverTime = firebase.database.ServerValue.TIMESTAMP;

        console.log("addNewGym called in admin.js");
        console.log(req.body);

        var filename = "";
        var gymUniqueId = "";
        var imgUrl = [];
        var pdfUrl = [];

        var sess = req.session;
        // create an incoming form object
        var form = new formidable.IncomingForm();

        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;

        // store all uploads in the /uploads directory
        ///if(req.File.size > 0)
        //{
        form.uploadDir = path.join(__dirname, '../public/images');
        //}

        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function (field, file) {
            //console.log(file);
            if (file.name === "") {
                console.log("False coming Here");
                if (file.path) {
                    fs.unlinkSync(file.path);
                }
            }
            else {
                console.log("True coming Here");
                console.log("path : ",file.path);
                console.log("name : ",file.name);
                fs.rename(file.path, path.join(form.uploadDir, file.name));
                filename = file.name;

                if (filename !== "") {
                    console.log("check come here ");
                    var storage = require('@google-cloud/storage');

                    // Authenticating on a per-API-basis. You don't need to do this if you auth on a
                    // global basis (see Authentication section above).

                    var gcs = storage({
                        projectId: config.projectId,
                        keyFilename: filePath
                    });

                    // Reference an existing bucket.
                    var bucket = gcs.bucket(config.storageBucket);
                    console.log("filename : "+filename);
                    // Upload a local file to a new file to be created in your bucket.

                    console.log("indexOf pdf : "+(filename.indexOf("pdf") >=0));
                    console.log("indexOf pdf1 : "+filename.indexOf("pdf"));

                    if (filename.indexOf("pdf") >=0) {
                        console.log("pdf is present");
                        bucket.upload("./public/images/" + filename, {
                            destination: "GymPdfs/" + filename,
                            public: true,
                            metadata: {contentType: 'application/pdf'}
                        }, function (err, file) {
                            if (!err) {
                                console.log("AFTER UPLOAD RETURN");
                                console.log(file.name);
                                filename = file.name;
    
                                // "zebra.jpg" is now in your bucket.
                                console.log("success");
                                console.log("filename : " + filename);
                                //res.send(createPublicFileURL(filename));
                                var publicURL = createPublicFileURL(filename);
                                console.log(publicURL);
    
                                pdfUrl.push(publicURL);
    
                                console.log("pdfUrl : " + pdfUrl, pdfUrl.length);
    
                                //For unlink local image from folder
    
                                //code end
    
                                // Code for save public url of the uploaded file
    
                                // Code end for save public url of the uploaded file
    
                                message = "Your file uploaded successfully.";
                                //res.render('addGym.ejs', {message:message, session:sess})
                                // res.redirect('/managerGym');
    
                                console.log("gymUniqueId..." + gymUniqueId);
    
                                if (gymUniqueId !== '') {
                                    var database = firebase.database();
    
                                    var gymRef = database.ref('Gyms').child(gymUniqueId);
    
                                    console.log("gymRef...", gymRef.toString());
    
                                    var updateDict = {
                                        updatedAt: serverTime,
                                        updatedBy: req.session.currentUser.uid
                                    };
    
                                    if (pdfUrl.length > 0) {
                                        updateDict.pdf = pdfUrl
                                    }
    
                                    console.log("updateDict...bucket.upload");
                                    console.log(updateDict);
    
                                    gymRef.update(updateDict);
                                }
                            } else {
                                res.send(err);
                            }
                        });
                    } else if (filename.indexOf("pdf") === -1) {
                        console.log("pdf is absent");
                        bucket.upload("./public/images/" + filename, {
                            destination: "GymProfileImage/" + filename,
                            public: true,
                            metadata: {contentType: 'image/jpg'}
                        }, function (err, file) {
                            if (!err) {
                                console.log("AFTER UPLOAD RETURN");
                                console.log(file.name);
                                filename = file.name;
    
                                // "zebra.jpg" is now in your bucket.
                                console.log("success");
                                console.log("filename : " + filename);
                                //res.send(createPublicFileURL(filename));
                                var publicURL = createPublicFileURL(filename);
                                console.log(publicURL);
    
                                imgUrl.push(publicURL);
    
                                console.log("imgUrl : " + imgUrl, imgUrl.length);
    
                                //For unlink local image from folder
    
                                //code end
    
                                // Code for save public url of the uploaded file
    
                                // Code end for save public url of the uploaded file
    
                                message = "Your file uploaded successfully.";
                                //res.render('addGym.ejs', {message:message, session:sess})
                                // res.redirect('/managerGym');
    
                                console.log("gymUniqueId..." + gymUniqueId);
    
                                if (gymUniqueId !== '') {
                                    var database = firebase.database();
    
                                    var gymRef = database.ref('Gyms').child(gymUniqueId);
    
                                    console.log("gymRef...", gymRef.toString());
    
                                    var updateDict = {
                                        updatedAt: serverTime,
                                        updatedBy: req.session.currentUser.uid
                                    };
    
                                    if (imgUrl.length > 0) {
                                        updateDict.img = imgUrl
                                    }
    
                                    console.log("updateDict...bucket.upload");
                                    console.log(updateDict);
    
                                    gymRef.update(updateDict);
                                }
                            } else {
                                res.send(err);
                            }
                        });
                    }
                    function createPublicFileURL(storageName) {
                        console.log("STORAGE NAME");
                        console.log(storageName);

                        var url_upload = 'http://storage.googleapis.com/' + config.storageBucket + '/' + storageName;
                        console.log(url_upload);
                        return url_upload;
                    }
                }
            }
        });

        // log any errors that occur
        form.on('error', function (err) {
            console.log('An error has occured: \n' + err);
        });

        // once all the files have been uploaded, send a response to the client
        form.on('end', function () {
            //res.end('success');
        });

        form.parse(req, function (err, fields, files) {
                        
            if (err) {
                console.log(err);
            }
            console.log("incoming fields via form parse..." + fields.gymId);
            console.log(fields);

            var services = fields.selected_services_value;
            var services_array = services.split(',');

            console.log("services : " + services);
            console.log("services_array : ", services_array, services_array.length);

            var hours_array = [];

            var sun = 'Sunday ' + fields.sunFrom + '-' + fields.sunTo;
            if (fields.sunClosed === '1') {
                sun = 'Sunday ' + CLOSED
            }
            hours_array.push(sun);

            var mon = 'Monday ' + fields.monFrom + '-' + fields.monTo;
            if (fields.monClosed === '1') {
                mon = 'Monday ' + CLOSED
            }
            hours_array.push(mon);

            var tue = 'Tuesday ' + fields.tueFrom + '-' + fields.tueTo;
            if (fields.tueClosed === '1') {
                tue = 'Tuesday ' + CLOSED
            }
            hours_array.push(tue);

            var wed = 'Wednesday ' + fields.wedFrom + '-' + fields.wedTo;
            if (fields.wedClosed === '1') {
                wed = 'Wednesday ' + CLOSED
            }
            hours_array.push(wed);

            var thu = 'Thursday ' + fields.thuFrom + '-' + fields.thuTo;
            if (fields.thuClosed === '1') {
                thu = 'Thursday ' + CLOSED
            }
            hours_array.push(thu);

            var fri = 'Friday ' + fields.friFrom + '-' + fields.friTo;
            if (fields.friClosed === '1') {
                fri = 'Friday ' + CLOSED
            }
            hours_array.push(fri);

            var sat = 'Saturday ' + fields.satFrom + '-' + fields.satTo;
            if (fields.satClosed === '1') {
                sat = 'Saturday ' + CLOSED
            }
            hours_array.push(sat);

            console.log("hours_array : ", hours_array, hours_array.length);


            var database = firebase.database();

            var addGymRef = database.ref('Gyms');

            console.log("addGymRef...", addGymRef.toString());

            var gymDict = {
                name: fields.name,
                address: fields.address,
                latitude: fields.latitude,
                longitude: fields.longitude,
                hoursOfOperation: hours_array,
                // coins : fields.coins,
                // gymBarCode : fields.gymBarCode,
                Services: services_array,
                status: 1,
                createdAt: serverTime,
                createdBy: req.session.currentUser.uid,
                coins: 0,
                city: fields.city,
                state: fields.state,
                zipcode: fields.zipcode,
                updatedAt: serverTime,
                updatedBy: req.session.currentUser.uid
            };

            console.log("updateDict...form.parse");
            console.log(gymDict);

            addGymRef.push(gymDict).then(function (gym) {
                console.log("Gym added successfully..." + gym.toString());

                var gymRefArray = gym.path.pieces_;
                var pushGymId = gymRefArray[gymRefArray.length - 1];
                console.log("user CheckIn ref : ", gymRefArray, gymRefArray.length);
                console.log("pushGymId : ", pushGymId);

                gymUniqueId = pushGymId;

                var serverTime = firebase.database.ServerValue.TIMESTAMP;

                firebase.auth().createUserWithEmailAndPassword(fields.email, fields.password).then(
                    function (user) {
                        var u_id = user.uid;

                        console.log("user id : ", user.uid);
                        var database = firebase.database();
                        var userRef = database.ref('User').child(u_id);
                        console.log("database refernce : ", userRef.toString());

                        var gymDict = {
                            id: gymUniqueId,
                            name: fields.name,
                            status: 1,
                            createdAt: serverTime,
                            createdBy: req.session.currentUser.uid,
                            updatedAt: serverTime,
                            updatedBy: req.session.currentUser.uid
                        };

                        userRef.set({
                            email: fields.email,
                            type: UserType_GymManager,
                            gym: gymDict,
                            status: 1,
                            createdAt: serverTime,
                            createdBy: u_id,
                            name: fields.username
                        });

                        var gymManagerDict = {
                            email: fields.email,
                            id: u_id,
                            name: fields.username,
                            updatedAt: serverTime,
                            updatedBy: req.session.currentUser.uid
                        };

                        database.ref('Gyms').child(gymUniqueId).update({gymManager: gymManagerDict});

                        // res.redirect('/manageGym');
                        setTimeout(function(){
                            createStripeCustomerAPI(fields.email, u_id, res, req, serverTime,'','/manageGym',false);
                        }, 5000);    
                    },
                    function (err) {
                        console.error("Error in creating gym manager user...");
                        console.error(err);

                        gymUniqueId = "";
                        addGymRef.child(pushGymId).remove();

                        req.flash('error', err.message);

                        if ((err.message).indexOf(DENIED) >= 0) {
                            res.redirect(adminUrl);
                        } else {
                            res.redirect('back');
                        }
                    }
                );
            }, function errdata(err) {
                console.log("addNewGym(admin.js) Error in push data : " + typeof(err.message));
                console.log(err);
                req.flash('error', err.message);
                if ((err.message).indexOf(DENIED) >= 0) {
                    res.redirect(adminUrl);
                } else {
                    res.redirect('back');
                }
            });
        });
    } else {
        res.redirect(adminUrl);
    }
};

//==================== App User Section ====================

// List of available app users
exports.manageUsers = function(req, res){
    session = req.session;
    session.current = 'adminUser';
    //res.render('index');
    console.log("welcome to manageuser ");
    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var database = firebase.database();
        var ref=database.ref('User').orderByChild('status').equalTo(1);
        ref.once('value',function gotdata(data){

            if (data.exists()) {

                // console.log(data.val());
                var user = data.val();
                var keys = Object.keys(user);
                var userData = [];

                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];

                    // console.log("@@@@ before profileImage : "+user[k].profileImage+" ,condition : "+(user[k].profileImage === undefined)+" ,placeHolderImgUrl : "+placeHolderImgUrl);

                    user[k].firstname = ((user[k].firstname === undefined) ? 'N/A' : user[k].firstname);
                    user[k].lastname = ((user[k].lastname === undefined) ? 'N/A' : user[k].lastname);
                    user[k].email = ((user[k].email === undefined) ? 'N/A' : user[k].email);
                    // user[k].birthdate = ((user[k].birthdate === undefined) ? 'N/A' : user[k].birthdate);
                    user[k].gender = ((user[k].gender === undefined) ? 'N/A' : user[k].gender);
                    user[k].city = ((user[k].city === undefined) ? 'N/A' : user[k].city);
                    user[k].state = ((user[k].state === undefined) ? 'N/A' : user[k].state);
                    user[k].coinBalance = ((user[k].coinBalance === undefined) ? '0' : user[k].coinBalance);
                    user[k].type = ((user[k].type === undefined) ? 'N/A' : user[k].type);
                    user[k].profileImage = ((user[k].profileImage === undefined) ? placeHolderImgUrl : user[k].profileImage);
                    user[k].userId = k;

                    // console.log("after profileImage : "+user[k].profileImage+" ,condition : "+(user[k].profileImage === undefined));

                    //Only App users
                    if ((user[k].type !== UserType_GymManager) && (user[k].type !== UserType_SuperAdmin)) {

                        // console.log("user id is : ",user[k].userId+" ,birthdate : "+user[k].birthdate);

                        var createdAtDate = new Date(user[k].createdAt);
                        console.log("email : "+user[k].email+" ,createdAtDate : "+createdAtDate.toLocaleDateString());

                        var bday = new Date(user[k].birthdate);
                        user[k].birthdate = bday.toLocaleDateString();
                        userData.push(user[k]);
                    }
                }

                userData.sort(function(a, b){
                    if(a.createdAt < b.createdAt) return -1;
                    if(a.createdAt > b.createdAt) return 1;
                    return 0;
                });
                userData.reverse();

                res.render('admin/manageUsers', {result: userData});
            }
            else {
                var userData = [];
                res.render('admin/manageUsers', {result: userData});
            }
        },function errdata(err){
            console.log("manageUsers(admin.js) Error in get users : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

//Open add app user page
exports.addUserByAdmin = function(req, res){

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var stateArray = constant.stateArray;
        var maxImageSize = constant.maxImageSize;

        res.render('admin/add_user', {states: stateArray, maxImageSize: maxImageSize});
    } else {
        res.redirect(adminUrl);
    }
};

//Delete App User
exports.deleteUserByAdmin = function(req, res){

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var serverTime = firebase.database.ServerValue.TIMESTAMP;

        var userId = req.params.userId;

        console.log("deleteUserByAdmin(admin.js) called..." + userId);

        var database = firebase.database();

        var userRef = database.ref('User').child(userId);

        console.log("userRef...", userRef.toString());

        var updateDict = {
            status: 0,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        };

        console.log("updateDict...");
        console.log(updateDict);

        userRef.update(updateDict);

        req.flash('notify', 'User has been deleted!');
        res.redirect('/manageUsers');
    } else {
        res.redirect(adminUrl);
    }
};

// update gym by admin
exports.adminUpdateGym = function(req, res){

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);
    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    if (currentUser) {

        console.log("adminUpdateGym(admin.js) called...");

        // console.log(req.body);
        var filename = "";
        var gymUniqueId = "";
        var imgUrl = [];
        var pdfUrl = [];

        console.log("called File Upload");
        // console.log(req);
        //console.log(req.body);
        var sess = req.session;
        // create an incoming form object
        var form = new formidable.IncomingForm();

        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;

        // store all uploads in the /uploads directory
        ///if(req.File.size > 0)
        //{
        form.uploadDir = path.join(__dirname, '../public/images');
        //}

        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function (field, file) {
            //console.log(file);
            if (file.name === "") {
                console.log("False coming Here");
                // fs.unlinkSync(file.path);
            }
            else {
                console.log("True coming Here");
                console.log("path : ",file.path);
                console.log("name : ",file.name);
                fs.rename(file.path, path.join(form.uploadDir, file.name));
                filename = file.name;

                if (filename !== "") {
                    console.log("check come here ");
                    var storage = require('@google-cloud/storage');

                    // Authenticating on a per-API-basis. You don't need to do this if you auth on a
                    // global basis (see Authentication section above).
                    
                    var gcs = storage({
                        projectId: config.projectId,
                        keyFilename: filePath
                    });

                    // Reference an existing bucket.
                    var bucket = gcs.bucket(config.storageBucket);
                    console.log(filename);
                    // Upload a local file to a new file to be created in your bucket.

                    console.log("indexOf pdf : "+(filename.indexOf("pdf") >=0));
                    console.log("indexOf pdf1 : "+filename.indexOf("pdf"));

                    if (filename.indexOf("pdf") >=0) {
                        console.log("pdf is present");

                        bucket.upload("./public/images/" + filename, {
                            destination: "GymPdfs/" + filename,
                            public: true,
                            metadata: {contentType: 'application/pdf'}
                        }, function (err, file) {
                            if (!err) {
                                console.log("AFTER UPLOAD RETURN");
                                console.log(file.name);
                                filename = file.name;
    
                                // "zebra.jpg" is now in your bucket.
                                console.log("success");
                                console.log("filename : " + filename);
                                //res.send(createPublicFileURL(filename));
                                var publicURL = createPublicFileURL(filename);
                                console.log(publicURL);
    
                                pdfUrl.push(publicURL);
    
                                console.log("pdfUrl : " + pdfUrl, pdfUrl.length);
    
                                //For unlink local image from folder
    
                                //code end
    
                                // Code for save public url of the uploaded file
    
                                // Code end for save public url of the uploaded file
    
                                message = "Your file uploaded successfully.";
                                //res.render('addGym.ejs', {message:message, session:sess})
                                // res.redirect('/managerGym');
    
                                console.log("gymUniqueId..." + gymUniqueId);
    
                                if (gymUniqueId !== '') {
                                    var database = firebase.database();
    
                                    var gymRef = database.ref('Gyms').child(gymUniqueId);
    
                                    console.log("gymRef...", gymRef.toString());
    
                                    var updateDict = {
                                        updatedAt: serverTime,
                                        updatedBy: req.session.currentUser.uid
                                    };
    
                                    if (pdfUrl.length > 0) {
                                        updateDict.pdf = pdfUrl
                                    }
    
                                    console.log("updateDict...bucket.upload");
                                    console.log(updateDict);
    
                                    gymRef.update(updateDict);
                                }
    
                            } else {
                                res.send(err);
                            }
                        });
                    } else if (filename.indexOf("pdf") === -1) {
                        console.log("pdf is absent");

                        bucket.upload("./public/images/" + filename, {
                            destination: "GymProfileImage/" + filename,
                            public: true,
                            metadata: {contentType: 'image/jpg'}
                        }, function (err, file) {
                            if (!err) {
                                console.log("AFTER UPLOAD RETURN");
                                console.log(file.name);
                                filename = file.name;
    
                                // "zebra.jpg" is now in your bucket.
                                console.log("success");
                                console.log("filename : " + filename);
                                //res.send(createPublicFileURL(filename));
                                var publicURL = createPublicFileURL(filename);
                                console.log(publicURL);
    
                                imgUrl.push(publicURL);
    
                                console.log("imgUrl : " + imgUrl, imgUrl.length);
    
                                //For unlink local image from folder
    
                                //code end
    
                                // Code for save public url of the uploaded file
    
                                // Code end for save public url of the uploaded file
    
                                message = "Your file uploaded successfully.";
                                //res.render('addGym.ejs', {message:message, session:sess})
                                // res.redirect('/managerGym');
    
                                console.log("gymUniqueId..." + gymUniqueId);
    
                                if (gymUniqueId !== '') {
                                    var database = firebase.database();
    
                                    var gymRef = database.ref('Gyms').child(gymUniqueId);
    
                                    console.log("gymRef...", gymRef.toString());
    
                                    var updateDict = {
                                        updatedAt: serverTime,
                                        updatedBy: req.session.currentUser.uid
                                    };
    
                                    if (imgUrl.length > 0) {
                                        updateDict.img = imgUrl
                                    }
    
                                    console.log("updateDict...bucket.upload");
                                    console.log(updateDict);
    
                                    gymRef.update(updateDict);
                                }
    
                            } else {
                                res.send(err);
                            }
                        });
                    }

                    function createPublicFileURL(storageName) {
                        console.log("STORAGE NAME");
                        console.log(storageName);

                        var url_upload = 'http://storage.googleapis.com/' + config.storageBucket + '/' + storageName;
                        console.log(url_upload);
                        return url_upload;
                    }
                }
            }
        });

        // log any errors that occur
        form.on('error', function (err) {
            console.log('An error has occured: \n' + err);
        });

        // once all the files have been uploaded, send a response to the client
        form.on('end', function () {
            //res.end('success');
        });

        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
            }
            console.log("incoming fields via form parse..." + fields.gymId);
            console.log(fields);
            console.log("form.parse imgUrl : " + imgUrl);
            gymUniqueId = fields.gymId;

            console.log("gymUniqueId : " + gymUniqueId);

            var services = fields.selected_services_value;
            var services_array = services.split(',');

            console.log("services : " + services);
            console.log("services_array : ", services_array, services_array.length);

            var hours_array = [];

            var sun = 'Sunday ' + fields.sunFrom + '-' + fields.sunTo;
            if (fields.sunClosed === '1') {
                sun = 'Sunday ' + CLOSED
            }
            hours_array.push(sun);

            var mon = 'Monday ' + fields.monFrom + '-' + fields.monTo;
            if (fields.monClosed === '1') {
                mon = 'Monday ' + CLOSED
            }
            hours_array.push(mon);

            var tue = 'Tuesday ' + fields.tueFrom + '-' + fields.tueTo;
            if (fields.tueClosed === '1') {
                tue = 'Tuesday ' + CLOSED
            }
            hours_array.push(tue);

            var wed = 'Wednesday ' + fields.wedFrom + '-' + fields.wedTo;
            if (fields.wedClosed === '1') {
                wed = 'Wednesday ' + CLOSED
            }
            hours_array.push(wed);

            var thu = 'Thursday ' + fields.thuFrom + '-' + fields.thuTo;
            if (fields.thuClosed === '1') {
                thu = 'Thursday ' + CLOSED
            }
            hours_array.push(thu);

            var fri = 'Friday ' + fields.friFrom + '-' + fields.friTo;
            if (fields.friClosed === '1') {
                fri = 'Friday ' + CLOSED
            }
            hours_array.push(fri);

            var sat = 'Saturday ' + fields.satFrom + '-' + fields.satTo;
            if (fields.satClosed === '1') {
                sat = 'Saturday ' + CLOSED
            }
            hours_array.push(sat);

            console.log("hours_array : ", hours_array, hours_array.length);

            var database = firebase.database();

            var gymRef = database.ref('Gyms').child(fields.gymId);
            var gymManagerRef = database.ref('Gyms').child(fields.gymId).child(UserType_GymManager);
            var userRef = database.ref('User').child(fields.userid);

            console.log("gymRef...", gymRef.toString());
            console.log("gymManagerRef...", gymManagerRef.toString());
            console.log("userRef...", userRef.toString());

            var gymManagerDict = {
                name: fields.username,
                updatedAt: serverTime,
                updatedBy: req.session.currentUser.uid
            };

            var updateDict = {
                name: fields.name,
                address: fields.address,
                latitude: fields.latitude,
                longitude: fields.longitude,
                hoursOfOperation: hours_array,
                // coins : fields.coins,
                // gymBarCode : fields.gymBarCode,
                Services: services_array,
                status: 1,
                city: fields.city,
                state: fields.state,
                zipcode: fields.zipcode,
                updatedAt: serverTime,
                updatedBy: req.session.currentUser.uid
            };

            console.log("updateDict...form.parse");
            console.log(updateDict);

            console.log("gymManagerDict...form.parse");
            console.log(gymManagerDict);

            gymRef.update(updateDict);
            gymManagerRef.update(gymManagerDict);
            userRef.update(gymManagerDict);
            userRef.child('gym').update({name: fields.name});

            // req.flash('notify', 'Gym Profile has been updated!');
            // res.redirect('/manageGym');

            createStripeCustomerAPI(fields.gymManagerEmail, fields.userid, res, req, serverTime,'Gym Profile has been updated!','/manageGym',true);
        });
    } else {
        res.redirect(adminUrl);
    }
};

//Add new app user in system
exports.addNewUser = function (req,res) {

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("addNewUser called in admin.js");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {

        var filename = "";
        var userUniqueId = "";

        var form = new formidable.IncomingForm();

        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;

        // store all uploads in the /uploads directory
        ///if(req.File.size > 0)
        //{
        form.uploadDir = path.join(__dirname, '../public/images');
        //}

        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function (field, file) {
            //console.log(file);
            if (file.name === "") {
                console.log("False coming Here");
                if (file.path) {
                    fs.unlinkSync(file.path);
                }
            }
            else {
                console.log("True coming Here");
                console.log(file.path);
                fs.rename(file.path, path.join(form.uploadDir, file.name));
                filename = file.name;

                if (filename !== "") {
                    console.log("check come here ");
                    var storage = require('@google-cloud/storage');

                    // Authenticating on a per-API-basis. You don't need to do this if you auth on a
                    // global basis (see Authentication section above).

                    var gcs = storage({
                        projectId: config.projectId,
                        keyFilename: filePath
                    });

                    // Reference an existing bucket.
                    var bucket = gcs.bucket(config.storageBucket);
                    console.log(filename);
                    // Upload a local file to a new file to be created in your bucket.

                    bucket.upload("./public/images/" + filename, {
                        destination: "userProfile/" + filename,
                        public: true,
                        metadata: {contentType: 'image/jpg'}
                    }, function (err, file) {
                        if (!err) {
                            console.log("AFTER UPLOAD RETURN");
                            console.log(file.name);
                            filename = file.name;

                            // "zebra.jpg" is now in your bucket.
                            console.log("success");
                            console.log("filename : " + filename);
                            //res.send(createPublicFileURL(filename));
                            var publicURL = createPublicFileURL(filename);
                            console.log(publicURL);

                            //For unlink local image from folder

                            //code end

                            // Code for save public url of the uploaded file

                            // Code end for save public url of the uploaded file

                            message = "Your file uploaded successfully.";
                            //res.render('addGym.ejs', {message:message, session:sess})
                            // res.redirect('/managerGym');

                            console.log("bucket.upload userUniqueId..." + userUniqueId);

                            if (userUniqueId !== '') {
                                var database = firebase.database();

                                var gymRef = database.ref('User').child(userUniqueId);

                                console.log("gymRef...", gymRef.toString());

                                var updateDict = {
                                    profileImage: publicURL,
                                    updatedAt: serverTime,
                                    updatedBy: req.session.currentUser.uid
                                };

                                console.log("updateDict...bucket.upload");
                                console.log(updateDict);

                                gymRef.update(updateDict);
                            }

                        } else {
                            res.send(err);
                        }
                    });

                    function createPublicFileURL(storageName) {
                        console.log("STORAGE NAME");
                        console.log(storageName);

                        var url_upload = 'http://storage.googleapis.com/' + config.storageBucket + '/' + storageName;
                        console.log(url_upload);
                        return url_upload;
                    }
                }
            }
        });

        // log any errors that occur
        form.on('error', function (err) {
            console.log('An error has occured: \n' + err);
        });

        // once all the files have been uploaded, send a response to the client
        form.on('end', function () {
            //res.end('success');
        });

        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
            }
            console.log("incoming fields via form parse..." + fields.gymId);
            console.log(fields);

            var firstname = fields.firstname;
            var lastname = fields.lastname;
            var email = fields.email;
            var state = fields.state;
            var city = fields.city;
            var gender = fields.gender;
            var password = fields.password;
            var birthdate = fields.birthdate;

            var serverTime = firebase.database.ServerValue.TIMESTAMP;

            firebase.auth().createUserWithEmailAndPassword(email, password).then(
                function (user) {
                    var u_id = user.uid;
                    userUniqueId = u_id;

                    console.log("firebase.auth() userUniqueId..." + userUniqueId);

                    console.log("user id : ", user.uid);
                    var database = firebase.database();
                    var userRef = database.ref('User').child(u_id);
                    console.log("database refernce : ", userRef.toString());
                    userRef.set({
                        firstname: firstname,
                        lastname: lastname,
                        email: email,
                        state: state,
                        city: city,
                        gender: gender,
                        birthdate: birthdate,
                        status: 1,
                        createdAt: serverTime,
                        createdBy: req.session.currentUser.uid,
                        signInMethod: 'Email'
                    });
                    setTimeout(function(){
                        createStripeCustomerAPI(email, u_id, res, req, serverTime,'','/manageUsers',false);
                    }, 5000);
                },
                function (err) {
                    console.log("addNewUser(admin.js) Error in add app user : " + typeof(err.message));
                    console.log(err);
                    req.flash('error', err.message);
                    if ((err.message).indexOf(DENIED) >= 0) {
                        res.redirect(adminUrl);
                    } else {
                        res.redirect('back');
                    }
                }
            );
        });
    } else {
        res.redirect(adminUrl);
    }
};

//API call for add new stripe customer
function createStripeCustomerAPI(email,u_id,response,req,serverTime,message,redirectView,isUpdate)
{
    var url = constant.baseUrl + 'createStripeCustomer?email='+email;

    // const url = "https://maps.googleapis.com/maps/api/geocode/json?address=Florence";

    console.log("url..."+url);

    https.get(url, function(res)  {
        res.setEncoding("utf8");
        var body = "";
        res.on("data", function(data) {
            body += data;
        });
        res.on("end", function() {
            body = JSON.parse(body);

            console.log("body..."+body.id);
            console.log(body);

            var database = firebase.database();
            var userRef = database.ref('User').child(u_id);

            console.log("userRef..."+userRef.toString());

            var updateDict = {
                stripe_cust_id : body.id ,
                updatedAt: serverTime,
                updatedBy: req.session.currentUser.uid
            };

            console.log(updateDict);

            userRef.update(updateDict);

            if (isUpdate) {
                req.flash('notify', message);
            }
            response.redirect(redirectView);
        });
    });
}

// Open update user page
exports.adminUserUpdate = function(req, res){

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var stateArray = constant.stateArray;
        var maxImageSize = constant.maxImageSize;

        var userId = req.params.userId;
        console.log("user id is : " + userId);

        var database = firebase.database();
        var userRef = database.ref('User').child(userId);

        console.log("userRef : ", userRef.toString());

        userRef.once('value', function gotdata(userData) {

            var userDataVal = userData.val();
            var userKeys = Object.keys(userDataVal);

            console.log("userKeys : " + userKeys);

            var userInfo = userDataVal;
            userInfo.id = userId;

            console.log("user info : ", userInfo);

            if (userInfo.firstname === undefined) {
                userInfo["firstname"] = "";
            }
            if (userInfo.lastname === undefined) {
                userInfo["lastname"] = "";
            }
            if (userInfo.birthdate === undefined) {
                userInfo["birthdate"] = "";
            }
            if (userInfo.state === undefined) {
                userInfo["state"] = "";
            }
            if (userInfo.city === undefined) {
                userInfo["city"] = "";
            }
            if (userInfo.gender === undefined) {
                userInfo["gender"] = "";
            }

            res.render('admin/updateUser', {user: userInfo, states: stateArray, maxImageSize: maxImageSize});

            // res.render('addGym', gymInfo);

        }, function errdata(err) {
            console.log("adminUserUpdate(admin.js) Error in get user : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    } else {
        res.redirect(adminUrl);
    }
};

//Update App User
exports.adminUpdateUser = function(req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("adminUpdateUser(admin.js) called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {

        var filename = "";
        var userUniqueId = "";

        var form = new formidable.IncomingForm();

        // specify that we want to allow the user to upload multiple files in a single request
        form.multiples = true;

        // store all uploads in the /uploads directory
        ///if(req.File.size > 0)
        //{
        form.uploadDir = path.join(__dirname, '../public/images');
        //}

        // every time a file has been uploaded successfully,
        // rename it to it's orignal name
        form.on('file', function (field, file) {
            //console.log(file);
            if (file.name === "") {
                console.log("False coming Here");
                if (file.path) {
                    fs.unlinkSync(file.path);
                }
            }
            else {
                console.log("True coming Here");
                console.log(file.path);
                fs.rename(file.path, path.join(form.uploadDir, file.name));
                filename = file.name;

                if (filename !== "") {
                    console.log("check come here ");
                    var storage = require('@google-cloud/storage');

                    // Authenticating on a per-API-basis. You don't need to do this if you auth on a
                    // global basis (see Authentication section above).

                    var gcs = storage({
                        projectId: config.projectId,
                        keyFilename: filePath
                    });

                    // Reference an existing bucket.
                    var bucket = gcs.bucket(config.storageBucket);
                    console.log(filename);
                    // Upload a local file to a new file to be created in your bucket.

                    bucket.upload("./public/images/" + filename, {
                        destination: "userProfile/" + filename,
                        public: true,
                        metadata: {contentType: 'image/jpg'}
                    }, function (err, file) {
                        if (!err) {
                            console.log("AFTER UPLOAD RETURN");
                            console.log(file.name);
                            filename = file.name;

                            // "zebra.jpg" is now in your bucket.
                            console.log("success");
                            console.log("filename : " + filename);
                            //res.send(createPublicFileURL(filename));
                            var publicURL = createPublicFileURL(filename);
                            console.log(publicURL);

                            //For unlink local image from folder

                            //code end

                            // Code for save public url of the uploaded file

                            // Code end for save public url of the uploaded file

                            message = "Your file uploaded successfully.";
                            //res.render('addGym.ejs', {message:message, session:sess})
                            // res.redirect('/managerGym');

                            console.log("bucket.upload userUniqueId..." + userUniqueId);

                            if (userUniqueId !== '') {
                                var database = firebase.database();

                                var gymRef = database.ref('User').child(userUniqueId);

                                console.log("gymRef...", gymRef.toString());

                                var updateDict = {
                                    profileImage: publicURL,
                                    updatedAt: serverTime,
                                    updatedBy: req.session.currentUser.uid
                                };

                                console.log("updateDict...bucket.upload");
                                console.log(updateDict);

                                gymRef.update(updateDict);
                            }

                        } else {
                            res.send(err);
                        }
                    });

                    function createPublicFileURL(storageName) {
                        console.log("STORAGE NAME");
                        console.log(storageName);

                        var url_upload = 'http://storage.googleapis.com/' + config.storageBucket + '/' + storageName;
                        console.log(url_upload);
                        return url_upload;
                    }
                }
            }
        });

        // log any errors that occur
        form.on('error', function (err) {
            console.log('An error has occured: \n' + err);
        });

        // once all the files have been uploaded, send a response to the client
        form.on('end', function () {
            //res.end('success');
        });

        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(err);
            }
            console.log("incoming fields via form parse..." + fields.gymId);
            console.log(fields);

            var firstname = fields.firstname;
            var lastname = fields.lastname;
            var state = fields.state;
            var city = fields.city;
            var gender = fields.gender;
            var birthdate = fields.birthdate;

            userUniqueId = fields.userId;

            console.log("form.parse..." + userUniqueId);

            var database = firebase.database();
            var userRef = database.ref('User').child(fields.userId);

            var updateDict = {
                firstname: firstname,
                lastname: lastname,
                birthdate: birthdate,
                state: state,
                city: city,
                gender: gender,
                status: 1,
                updatedAt: serverTime,
                updatedBy: req.session.currentUser.uid
            };

            console.log("updateDict...");
            console.log(updateDict);

            userRef.update(updateDict);

            // req.flash('notify', 'user Profile has been updated!');
            // res.redirect('/manageUsers');

            createStripeCustomerAPI(fields.email, fields.userId, res, req, serverTime,'user Profile has been updated!','/manageUsers',true);

        });
    } else {
        res.redirect(adminUrl);
    }
};

//Add coins to app user
exports.addCoinsForUser = function (req, res) {

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("addCoinsForUser(admin.js) called...");
    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var database = firebase.database();
        var userRef = database.ref('User').child(req.body.userId);

        console.log("userRef : " + userRef.toString());

        var coins = parseFloat(req.body.coins);
        var coinbalance = parseFloat(req.body.coinbalance);

        var totalCoins = coins + coinbalance;

        console.log("totalCoins : " + totalCoins);

        var userDict = {
            coinBalance: totalCoins,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        };

        userRef.update(userDict);

        var coinTransactionRef = database.ref('CoinTransaction');

        console.log("coinTransactionRef : " + coinTransactionRef.toString());

        var coinTransactionDict = {
            coins: coins,
            createdAt: serverTime,
            createdBy: req.session.currentUser.uid,
            frinedId: "",
            planType: "",
            status: 1,
            trxType: "CREDIT",
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid,
            userId: req.body.userId
        };

        console.log("coinTransactionDict...");
        console.log(coinTransactionDict);

        coinTransactionRef.push(coinTransactionDict).then(function (gym) {

            console.log("coins added successfully...");

            req.flash('notify', 'Coins added successfully...');
            res.redirect('/manageUsers');

        }, function (err) {
            console.log("addCoinsForUser(admin.js) Error in push : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    } else {
        res.redirect(adminUrl);
    }
};

//==================== CheckIn Section ====================

//CheckIn history
exports.listUserCheckIns = function(req, res){
    //res.render('index');
    session = req.session;
    session.current = 'adminCheckin';

    console.log("listUserCheckIns called .....");

    var currentUser = req.session.currentUser;
    // console.log("currentUser : "+currentUser);

    if (currentUser) {
        var database = firebase.database();
        var ref = database.ref('Gyms').orderByChild('status').equalTo(1);
        ref.once('value', function gotdata(data) {

            if (data.exists()) {

                var gym_User = data.val();
                var keys = Object.keys(gym_User);

                // console.log("gym_User...");
                // console.log(gym_User);

                var gymCheckInUsers = [];

                for (var i = 0; i < keys.length; i++) {
                    var gymId = keys[i];
                    var gym = gym_User[gymId];

                    // console.log(i+"##### gymId : "+gymId+" ,name : "+gym["name"]);

                    var gymCheckIns = gym["Users"];
                    if (gymCheckIns)
                    {
                        var gymCheckInsKeys = Object.keys(gymCheckIns);

                        // console.log("gymCheckInsKeys : " + gymCheckInsKeys);

                        var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

                        // console.log("!!!!! timezone : " + timezone);

                        for (var j = 0; j < gymCheckInsKeys.length; j++) {
                            var dict = gymCheckIns[gymCheckInsKeys[j]];

                            dict.id = gymCheckInsKeys[j];
                            dict.gymId = gymId;
                            dict.gymName = gym["name"];
                            dict.userCity = ((dict.userCity === undefined) ? 'N/A' : dict.userCity);
                            dict.userState = ((dict.userState === undefined) ? 'N/A' : dict.userState);
                            dict.userProfileImage = ((dict.userProfileImage === undefined) ? placeHolderImgUrl : dict.userProfileImage);

                            // console.log("@@@@@ dict barcodeURL: ",dict.barcodeURL,dict.userName);

                            // var gmtDateTime = moment.utc(dict["dateTime"])
                            // var local = gmtDateTime.local().format('MM/DD/YYYY hh:mm A');
                            // dict.dateTime = local
                            dict.dateTimeStamp = dict.dateTime
                            dict.dateTime = new Date(dict.dateTime).toLocaleString("en-US", {timeZone: "America/New_York"});//.toString();

                            // if (dict.checkInStatus === 2) {
                                if (dict.userName || dict.barcodeURL) {
                                    gymCheckInUsers.push(dict);
                                }
                            // }
                        }
                    }
                }

                // gymCheckInUsers.sort(function(a, b){
                //     if(a.dateTimeStamp < b.dateTimeStamp) return -1;
                //     if(a.dateTimeStamp > b.dateTimeStamp) return 1;
                //     return 0;
                // });

                gymCheckInUsers.sort(function(x, y){
                    return x.dateTimeStamp - y.dateTimeStamp;
                })

                var finalArray = gymCheckInUsers.reverse();

                // console.log("after reverse..." + finalArray.length);
                // console.log(finalArray);

                res.render('admin/listUserCheckIns', {result: finalArray});
            }
            else {
                var finalArray =[];
                res.render('admin/listUserCheckIns', {result: finalArray});
            }

        }, function errdata(err) {
            console.log("listUserCheckIns(admin.js) Error in get gym data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

exports.myProfile = function(req, res){
    //res.render('index');
    res.render('admin/profile');
};

//==================== Teammate Section ====================

// List of teammates
exports.teammates = function (req, res) {

    session = req.session;
    session.current = 'teammates';

    console.log("teammates called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var database = firebase.database();
        var ref = database.ref('AdminUser').orderByChild('status').equalTo(1);

        console.log("ref : "+ref.toString());

        ref.once('value', function gotdata(data) {

            var teammatesArray =[];

            if (data.exists()) {

                var admin_User = data.val();
                var keys = Object.keys(admin_User);

                for (var i = 0; i < keys.length; i++) {
                    var gymId = keys[i];
                    var gym = admin_User[gymId];

                    if (gym.type === UserType_AdminTeammate) {

                        console.log(i+"@@@i..."+gym.email);

                        var createdAtDate = new Date(gym.createdAt);
                        // console.log("createdAtDate : "+createdAtDate);
                        console.log("str : "+createdAtDate.toString());
                        teammatesArray.push(gym);
                    }
                }
                teammatesArray.sort(function(a, b){
                    if(a.createdAt < b.createdAt) return -1;
                    if(a.createdAt > b.createdAt) return 1;
                    return 0;
                });
                teammatesArray.reverse();
                res.render('admin/listTeammates',{result: teammatesArray});
            }
            else {
                res.render('admin/listTeammates',{result: teammatesArray});
            }

        }, function errdata(err) {
            console.log("teammates(admin.js) Error in get teammates : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

//Open page for add new teammate
exports.addTeammatesByAdmin = function (req, res) {

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var stateArray = constant.stateArray;
        var maxImageSize = constant.maxImageSize;

        console.log("addTeammatesByAdmin called...");
        res.render('admin/addTeammate', {states: stateArray, maxImageSize: maxImageSize});
    } else {
        res.redirect(adminUrl);
    }
};

//Add new teammate in system
exports.addNewTeammate = function (req, res) {

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("addNewTeammate called...");
    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {

        firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.password).then(
            function (user) {
                var u_id = user.uid;
                userUniqueId = u_id;

                console.log("firebase.auth() userUniqueId..." + userUniqueId);

                console.log("user id : ", user.uid);
                var database = firebase.database();
                var userRef = database.ref('AdminUser').child(u_id);
                console.log("database refernce : ", userRef.toString());
                userRef.update({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email,
                    status: 1,
                    createdAt: serverTime,
                    createdBy: req.session.currentUser.uid,
                    signInMethod: 'Email',
                    type: UserType_AdminTeammate,
                    userId: user.uid
                });

                res.redirect('/teammates');
            },
            function (err) {
                console.log("addNewTeammate(admin.js) Error in create new teammate : " + typeof(err.message));
                console.log(err);
                req.flash('error', err.message);
                if ((err.message).indexOf(DENIED) >= 0) {
                    res.redirect(adminUrl);
                } else {
                    res.redirect('back');
                }
            }
        );
    } else {
        res.redirect(adminUrl);
    }
};

//Open update teammate page
exports.teammateUpdate = function (req, res) {

    console.log("teammateUpdate called...");

    var teammateId = req.params.teammateId;

    console.log("teammateId..."+teammateId);

    var database = firebase.database();
    var adminUserRef = database.ref('AdminUser/'+teammateId);

    console.log("adminUserRef..."+adminUserRef);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        adminUserRef.once('value',function gotdata(adminUserData){

            if (adminUserData.exists()) {
                var adminUserDataVal = adminUserData.val();
                var adminUserDataKeys = Object.keys(adminUserDataVal);

                console.log("adminUserDataKeys : " + adminUserDataKeys);
                console.log(adminUserDataVal);

                res.render('admin/updateTeammate',{teammate : adminUserDataVal});
            }
            else {

            }
        },function errdata(err){
            console.log("teammateUpdate(admin.js) Error in get teammate data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

//Update teammate
exports.updateTeammate = function(req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("teammateUpdate called...");
    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var teammateId = req.body.userId;

        console.log("teammateId..." + teammateId);

        var database = firebase.database();
        var adminUserRef = database.ref('AdminUser/' + teammateId);

        console.log("adminUserRef..." + adminUserRef);

        adminUserRef.update({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        });

        req.flash('notify', 'Teammate Profile has been updated!');
        res.redirect('/teammates');
    } else {
        res.redirect(adminUrl);
    }
};

//Delete teammate
exports.deleteTeammate = function (req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;
    
    console.log("deleteTeammate called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var teammateId = req.params.teammateId;

        console.log("teammateId..." + teammateId);

        var database = firebase.database();
        var adminUserRef = database.ref('AdminUser/' + teammateId);

        console.log("adminUserRef..." + adminUserRef);

        adminUserRef.update({
            status: 0,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        });

        req.flash('notify', 'Teammate has been deleted!');
        res.redirect('/teammates');
    } else {
        res.redirect(adminUrl);
    }
};

//==================== SuperAdmin Section ====================

//List of superadmins
exports.superAdmins = function (req, res){

    session = req.session;
    session.current = 'superAdmins';

    console.log("superAdmins called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var database = firebase.database();
        var ref = database.ref('AdminUser').orderByChild('status').equalTo(1);

        console.log("ref : "+ref.toString());

        ref.once('value', function gotdata(data) {

            var teammatesArray =[];

            if (data.exists()) {

                var admin_User = data.val();
                var keys = Object.keys(admin_User);

                for (var i = 0; i < keys.length; i++) {
                    var gymId = keys[i];
                    var gym = admin_User[gymId];

                    if (gym.type === UserType_SuperAdmin) {

                        console.log(i+"@@@i..."+gym.email);

                        var createdAtDate = new Date(gym.createdAt);
                        // console.log("createdAtDate : "+createdAtDate);
                        console.log("str : "+createdAtDate.toString());

                        teammatesArray.push(gym);
                    }
                }
                teammatesArray.sort(function(a, b){
                    if(a.createdAt < b.createdAt) return -1;
                    if(a.createdAt > b.createdAt) return 1;
                    return 0;
                });
                teammatesArray.reverse();
                res.render('admin/listSuperAdmins',{result: teammatesArray});
            }
            else {
                res.render('admin/listSuperAdmins',{result: teammatesArray});
            }

        }, function errdata(err) {
            console.log("superAdmins(admin.js) Error in get superAdmin data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

//Open add superadmin page
exports.addSuperAdminByAdmin = function (req, res){

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var stateArray = constant.stateArray;
        var maxImageSize = constant.maxImageSize;

        console.log("addTeammatesByAdmin called...");
        res.render('admin/addSuperAdmin', {states: stateArray, maxImageSize: maxImageSize});
    } else {
        res.redirect(adminUrl);
    }
};

//Add new superAdmin in system
exports.addNewSuperAdmin = function (req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("addNewSuperAdmin called...");
    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        firebase.auth().createUserWithEmailAndPassword(req.body.email, req.body.password).then(
            function (user) {
                var u_id = user.uid;
                userUniqueId = u_id;

                console.log("firebase.auth() userUniqueId..." + userUniqueId);

                console.log("user id : ", user.uid);
                var database = firebase.database();
                var userRef = database.ref('AdminUser').child(u_id);
                console.log("database refernce : ", userRef.toString());
                userRef.update({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: req.body.email,
                    status: 1,
                    createdAt: serverTime,
                    createdBy: req.session.currentUser.uid,
                    signInMethod: 'Email',
                    type: UserType_SuperAdmin,
                    userId: user.uid
                });

                res.redirect('/superAdmins');
            },
            function (err) {
                console.log("superAdmins(admin.js) Error in create super Admin data : " + typeof(err.message));
                console.log(err);
                req.flash('error', err.message);
                if ((err.message).indexOf(DENIED) >= 0) {
                    res.redirect(adminUrl);
                } else {
                    res.redirect('back');
                }
            }
        );
    } else {
        res.redirect(adminUrl);
    }
};

//Open update super Admin page
exports.superAdminUpdate = function (req, res){

    console.log("superAdminUpdate called...");

    var superAdminId = req.params.superAdminId;

    console.log("superAdminId..."+superAdminId);

    var database = firebase.database();
    var adminUserRef = database.ref('AdminUser/'+superAdminId);

    console.log("adminUserRef..."+adminUserRef);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        adminUserRef.once('value',function gotdata(adminUserData){

            if (adminUserData.exists()) {
                var adminUserDataVal = adminUserData.val();
                var adminUserDataKeys = Object.keys(adminUserDataVal);

                console.log("adminUserDataKeys : " + adminUserDataKeys);
                console.log(adminUserDataVal);

                res.render('admin/updateSuperAdmin',{teammate : adminUserDataVal});
            }
            else {

            }
        },function errdata(err){
            console.log("superAdmins(admin.js) Error in get super admin data : " + typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(adminUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(adminUrl);
    }
};

exports.updateSuperAdmin = function (req, res) {

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("updateSuperAdmin called...");
    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var teammateId = req.body.userId;

        console.log("teammateId..." + teammateId);

        var database = firebase.database();
        var adminUserRef = database.ref('AdminUser/' + teammateId);

        console.log("adminUserRef..." + adminUserRef);

        adminUserRef.update({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        });

        req.flash('notify', 'SuperAdmin Profile has been updated!');
        res.redirect('/superAdmins');
    } else {
        res.redirect(adminUrl);
    }
};

exports.deleteSuperAdmin = function (req, res) {

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("deleteSuperAdmin called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var teammateId = req.params.teammateId;

        console.log("teammateId..." + teammateId);

        var database = firebase.database();
        var adminUserRef = database.ref('AdminUser/' + teammateId);

        console.log("adminUserRef..." + adminUserRef);

        adminUserRef.update({
            status: 0,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        });

        req.flash('notify', 'SuperAdmin has been deleted!');
        res.redirect('/superAdmins');
    } else {
        res.redirect(adminUrl);
    }
};

//==================== Banking With Stripe ====================

// Create purchase order
exports.createPurchaseOrder = function (req, res) {

    session = req.session;

    console.log("createPurchaseOrder called...");
    console.log(req.body);
    // console.log(session.currentUser);
    var currentUserFullName = session.currentUser.firstname + ' ' + session.currentUser.lastname;

    var currentUser = req.session.currentUser;
    if (currentUser) {
        var currentUserFullName = currentUser.firstname + ' ' + currentUser.lastname;

        if (req.body.terms != constant.NET_TERMS_ARRAY[0]) {

            var completedDateTime = new Date();
            var termsVal = req.body.terms;

            if (termsVal.indexOf('15') >= 0) {
                completedDateTime.setDate(completedDateTime.getDate() + 15);
            } else if (termsVal.indexOf('30') >= 0) {
                completedDateTime.setDate(completedDateTime.getDate() + 30);
            }else if (termsVal.indexOf('45') >= 0) {
                completedDateTime.setDate(completedDateTime.getDate() + 45);
            }else if (termsVal.indexOf('60') >= 0) {
                completedDateTime.setDate(completedDateTime.getDate() + 60);
            }

            console.log("completedDateTime..."+completedDateTime);
            console.log("termsVal..."+termsVal);

            var purchaseDict = {
                gymId : req.body.gymId,
                purchaseOrderDate : req.body.orderDate,
                amount : req.body.amount,
                aggreementTerms : req.body.terms,
                stripeConnectAccountId : req.body.gymManagerStripeConnectId,
                status: 1,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: req.session.currentUser.uid,
                updatedAt : firebase.database.ServerValue.TIMESTAMP,
                updatedBy : req.session.currentUser.uid,
                orderCreatedAt : new Date().toDateString(),
                orderCompletedAt : completedDateTime.toDateString(),
                isOrderCompleted : false,
                gymManagerEmail : req.body.gymManagerEmail,
                gymManagerName : req.body.gymManagerName,
                gymName : req.body.gymName,
                adminName : currentUserFullName,
                adminEmail : currentUser.email
            };

            console.log("purchaseDict...");
            console.log(purchaseDict);

            var ref = firebase.database().ref('PurchaseOrders');
            ref.push(purchaseDict).then(function (order) {
                console.log("order added successfully..." + order.toString());

                // Order Created
                // Sent Email to Manager
                setTimeout(function(){
                    sentEmail(req.body.gymManagerEmail,'Your Order has been created by '+currentUserFullName,'Hello '+req.body.gymManagerName+',<br/><p>Your Order has been created by '+currentUserFullName+'<br/><p>Gym Name : '+req.body.gymName+'<br/><p>Amount : $'+req.body.amount+'<br/><p>CreatedAt : '+new Date().toDateString()+'<br/><p>CompletedAt : '+completedDateTime.toDateString()+'<br/><p>Agreement Terms : '+req.body.terms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                }, 2000);   
                // Sent Email to Admin
                setTimeout(function(){
                    sentEmail(currentUser.email,'You have created purchase order for '+req.body.gymManagerName,'Hello '+currentUserFullName+',<br/><p>You have created purchase order for '+req.body.gymManagerName+'<br/><p>Gym Name : '+req.body.gymName+'<br/><p>Amount : $'+req.body.amount+'<br/><p>CreatedAt : '+new Date().toDateString()+'<br/><p>CompletedAt : '+completedDateTime.toDateString()+'<br/><p>Agreement Terms : '+req.body.terms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                }, 2000); 

                req.flash('notify', 'Purchase Order created successfully.');
                res.redirect('back');
            });
        } else {
            stripe.accounts.listExternalAccounts(req.body.gymManagerStripeConnectId, {object: "bank_account"}, function(err, bank_accounts) {
                if (err) {
                    req.flash('error', err.message);
                    res.redirect('back');
                } else {
                    var data = bank_accounts.data;
                    if (data.length > 0) {  
                        console.log("stripe.accounts.listExternalAccounts...");
                        console.log(data[0]);
                        
                        var amountFinal = parseInt(parseFloat(req.body.amount) * 100);
                        // var amountFinal = parseFloat(req.body.amount);

                        var createDict = {
                            amount: amountFinal,
                            currency: data[0].currency,
                            destination: req.body.gymManagerStripeConnectId,
                            source_type : 'bank_account',
                            //  source_transaction: "py_1CXkRQFpzWlK6ATsNdwHAbT9" //chargeid
                        }
                        console.log("createDict...");
                        console.log(createDict);
                        
                        stripe.transfers.create(createDict, function(error, transfer) {
                
                            console.log("##### stripe.transfers.create...");
                            console.log("error...");
                            console.log(error);
                            console.log("transfer...");
                            console.log(transfer);
                
                            if (error) {
                                req.flash('error', error.message);
                                res.redirect('back');
                            } else {
                                var purchaseDict = {
                                    gymId : req.body.gymId,
                                    purchaseOrderDate : req.body.orderDate,
                                    amount : req.body.amount,
                                    aggreementTerms : req.body.terms,
                                    stripeConnectAccountId : req.body.gymManagerStripeConnectId,
                                    status: 1,
                                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                                    createdBy: req.session.currentUser.uid,
                                    updatedAt : firebase.database.ServerValue.TIMESTAMP,
                                    updatedBy : req.session.currentUser.uid,
                                    orderCreatedAt : new Date().toString(),
                                    orderCompletedAt : new Date().toString(),
                                    isOrderCompleted : true,
                                    transferId : transfer.id
                                };
                    
                                console.log("purchaseDict...");
                                console.log(purchaseDict);

                                var ref = firebase.database().ref('PurchaseOrders');
                                ref.push(purchaseDict).then(function (order) {
                                    console.log("order added successfully..." + order.toString());

                                    // Order Created
                                    // Sent Email to Manager
                                    setTimeout(function(){
                                        sentEmail(req.body.gymManagerEmail,'Your Order has been created by '+currentUserFullName,'Hello '+req.body.gymManagerName+',<br/><p>Your Order has been created by '+currentUserFullName+'<br/><p>Gym Name : '+req.body.gymName+'<br/><p>Amount : $'+req.body.amount+'<br/><p>CreatedAt : '+new Date().toDateString()+'<br/><p>CompletedAt : '+new Date().toDateString()+'<br/><p>Agreement Terms : '+req.body.terms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                                    }, 2000);   
                                    // Sent Email to Admin
                                    setTimeout(function(){
                                        sentEmail(currentUser.email,'You have created purchase order for '+req.body.gymManagerName,'Hello '+currentUserFullName+',<br/><p>You have created purchase order for '+req.body.gymManagerName+'<br/><p>Gym Name : '+req.body.gymName+'<br/><p>Amount : $'+req.body.amount+'<br/><p>CreatedAt : '+new Date().toDateString()+'<br/><p>CompletedAt : '+new Date().toDateString()+'<br/><p>Agreement Terms : '+req.body.terms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                                    }, 2000); 
                                    // Order Completed
                                    // Sent Email to Manager
                                    setTimeout(function(){
                                        sentEmail(req.body.gymManagerEmail,'Your Order has been completed.','Hello '+req.body.gymManagerName+',<br/><p>Your Order has been completed.<br/><p>Transfer Id : '+transfer.id+'<br/><p>Gym Name : '+req.body.gymName+'<br/><p>Amount : $'+req.body.amount+'<br/><p>CreatedAt : '+new Date().toDateString()+'<br/><p>CompletedAt : '+new Date().toDateString()+'<br/><p>Agreement Terms : '+req.body.terms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                                    }, 2000); 
                                    // Sent Email to Admin
                                    setTimeout(function(){
                                        sentEmail(currentUser.email,'You have completed purchase order for '+req.body.gymManagerName,'Hello '+currentUserFullName+',<br/><p>You have completed purchase order for '+req.body.gymManagerName+'<br/><p>Transfer Id : '+transfer.id+'<br/><p>Gym Name : '+req.body.gymName+'<br/><p>Amount : $'+req.body.amount+'<br/><p>CreatedAt : '+new Date().toDateString()+'<br/><p>CompletedAt : '+new Date().toDateString()+'<br/><p>Agreement Terms : '+req.body.terms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                                    }, 2000);

                                    req.flash('notify', 'Purchase Order created and completed successfully.');
                                    res.redirect('back');
                                });
                            }                   
                        });
                    } else {
                        req.flash('notify', "There is no Bank Information added");
                        res.redirect('back');
                    }
                }
            });
        }
        /*
        stripe.customers.listSources(req.body.gymManagerStripeId,{limit: 1, object: "bank_account"},function(err, bank_accounts) {
            if (err) {
                req.flash('error', err.message);
                res.redirect('back');
            } else {
                var data = bank_accounts.data;
                console.log(bank_accounts);
                if (data.length > 0) {
                    var account = data[0].account;
                    console.log("account..."+account);
                    console.log(data[0]);

                    // stripe.accounts.create({
                    //     type: 'custom',
                    //     country: 'US',
                    //     email: 'fitness_center@yopmail.com'
                    // }, function(errr, account) {
                    //     console.log("errr...");
                    //     console.log(errr);
                    //     console.log("account...");
                    //     console.log(account);
                    // });
                    // stripe.customers.retrieveSource(
                    //     req.body.gymManagerStripeId,
                    //     data[0].id,
                    // function(error, external_account) {
                    //     console.log("error...");
                    //     console.log(error);
                    //     console.log("external_account...");
                    //     console.log(external_account);
                    // });

                    // stripe.accounts.list( { limit: 1 }, function(errr, accounts) {
                    //     console.log("errr...");
                    //     console.log(errr);
                    //     console.log("accounts...");
                    //     console.log(accounts);
                    // });

                    var createDict = {
                        amount: req.body.amount,
                        currency: data[0].currency,
                        destination: 'acct_1CVIQQAmsb5JwfQn',
                    }
                    console.log("createDict...");
                    console.log(createDict);

                    stripe.transfers.create(createDict, function(error, transfer) {

                        console.log("error...stripe.transfers.create..."+error.message);
                        console.log(error);
                        console.log("transfer...");
                        console.log(transfer);

                        if (error) {
                            req.flash('error', error.message);
                            res.redirect('back');
                        } else {

                        }                   
                    });
                } else {
                    req.flash('notify', "There is no Bank Information added");
                    res.redirect('back');
                }
            }
        });
        */
    } else {
        res.redirect(adminUrl);
    }
};

function sentEmail(to,mailSubject,mailContent) {
    var from_email = new helper.Email('noreply@gymonkee.com');
    var to_email = new helper.Email(to);
    var subject = mailSubject
    var content = new helper.Content('text/html',mailContent);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid')(constant.SENDGRID_API_KEY);
    var request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON(),
    });   

    sg.API(request, function(errorInSendMail, response) {

        console.log("error...sg.API(request...");
        console.log(errorInSendMail);
        console.log("response...");
        console.log(response);

        if (errorInSendMail) {
            // req.flash('error', errorInSendMail.message);
            // res.redirect('back');
        } else {
            // req.flash('notify', 'Purchase Order made successfully.');
            // res.redirect('back');
        }
    });
}

function sentEmailUsingMandrill() {
    mandrill_client = new mandrill.Mandrill(mandrill_Key);
    var message = {
        "html": "<p>Example HTML content</p>",
        // "text": "Example text content",
        "subject": "example subject",
        "from_email": "message.from_email@example.com",
        // "from_name": "Example Name",
        "to": [{
                "email": "bypt.trainee@gmail.com",
                // "name": "Sujal Bandhara",
                "type": "to"
            }],
        // "headers": {
        //     "Reply-To": "message.reply@example.com"
        // },
        "important": false,
        "track_opens": null,
        "track_clicks": null,
        "auto_text": null,
        "auto_html": null,
        "inline_css": null,
        "url_strip_qs": null,
        "preserve_recipients": null,
        "view_content_link": null,
        // "bcc_address": "message.bcc_address@example.com",
        "tracking_domain": null,
        "signing_domain": null,
        "return_path_domain": null,
        "merge": true,
        "merge_language": "mailchimp",
        "global_merge_vars": [{
                "name": "merge1",
                "content": "merge1 content"
            }],
        "merge_vars": [{
                "rcpt": "recipient.email@example.com",
                "vars": [{
                        "name": "merge2",
                        "content": "merge2 content"
                    }]
            }],
        "tags": [
            "password-resets"
        ],
        // "subaccount": "customer-123",
        // "google_analytics_domains": [
        //     "example.com"
        // ],
        "google_analytics_campaign": "message.from_email@example.com",
        "metadata": {
            "website": "www.example.com"
        },
        "recipient_metadata": [{
                "rcpt": "recipient.email@example.com",
                "values": {
                    "user_id": 123456
                }
            }],
        // "attachments": [{
        //         "type": "text/plain",
        //         "name": "myfile.txt",
        //         "content": "ZXhhbXBsZSBmaWxl"
        //     }],
        "images": [{
                "type": "image/png",
                "name": "IMAGECID",
                "content": "ZXhhbXBsZSBmaWxl"
            }]
    };
    var async = true;
    var ip_pool = "Main Pool";
    var send_at = "example send_at";
    mandrill_client.messages.send({"message": message, "async": async, "ip_pool": ip_pool, "send_at": new Date().toString()}, function(result) {
        console.log(result);
        /*
        [{
                "email": "recipient.email@example.com",
                "status": "sent",
                "reject_reason": "hard-bounce",
                "_id": "abc123abc123abc123abc123abc123"
            }]
        */
    }, function(e) {
        // Mandrill returns the error as an object with name and message keys
        console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        console.log(e);
        // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
    });
}