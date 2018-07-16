var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var firebase = require('firebase');
const https = require("https");
var constant = require('./constant');

var stripe = require("stripe")(constant.secretKey);
var stripe_payout = require("stripe")(constant.secretKey_payout);

var filePath                = constant.file;
var config                  = constant.config;
var placeHolderImgUrl       = constant.placeHolderImgUrl;
var UserType_SuperAdmin     = constant.UserType_SuperAdmin;
var UserType_GymManager     = constant.UserType_GymManager;
var UserType_AdminTeammate  = constant.UserType_AdminTeammate;
var managerUrl              = constant.managerUrl;
var DENIED                  = constant.DENIED;
var CLOSED                  = constant.CLOSED;

// Open index page(Main login page)
exports.index = function(req, res){
    res.render('index');
};

// Login in manager web panel
exports.login = function(req, res){

    session = req.session;

    console.log("login(user.js) called...");
    // console.log(req.body);
    var sess = req.session;

    var username = req.body.username;
    var userpass = req.body.password;

    firebase.auth().signInWithEmailAndPassword(username,userpass).then(function (user) {

        console.log("login success...");

        if (user) {

            console.log("user exist..." + user.uid);

            var database = firebase.database();
            var currentUserRef = database.ref('User').child(user.uid);

            // console.log("currentUserRef : ",currentUserRef);

            currentUserRef.once('value', function gotdata(data) {
                console.log("data get from current user success...");

                if (data.exists()) {

                    var userData = data.val();
                    var keys = Object.keys(userData);

                    userData.uid = user.uid;

                    session.currentUser = userData;

                    console.log("type : " + userData.type);
                    
                    console.log("session.currentUser...");
                    console.log(session.currentUser);

                    if (userData.type === UserType_GymManager) {

                        if (userData.gym)
                        {
                            var gymName = userData.gym.name;
                            var status = userData.gym.status;

                            if (status === 0) {
                                req.flash('notify', gymName + ' has been deleted by admin' );
                                res.redirect(managerUrl);
                            }
                            else {

                                res.redirect('dashboard');
                            }
                        }
                        else {
                            req.flash('notify', 'Please Login with GymManager user');
                            res.redirect(managerUrl);
                        }
                    }
                    else {
                        req.flash('notify', 'Please Login with GymManager user');
                        res.redirect(managerUrl);
                    }
                }
                else {
                    req.flash('notify', 'Please Login with GymManager user');
                    res.redirect(managerUrl);
                }
            }, function errdata(err) {
                console.log("error in get current user info...");
                console.log(err.message);
                req.flash('error', err.message);
                res.redirect(managerUrl);
            });
        }
        else {
            res.redirect(managerUrl);
        }
    }).catch(function(error) {
        console.log("error in login...");
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect(managerUrl);
    });
};

//forgot password
exports.forgotPassword = function(req, res){
    console.log("forgotPassword(user.js) called...");
    console.log(req.body);

    var email = req.body.email;

    firebase.auth().sendPasswordResetEmail(email).then(function(user){
        console.log("Mail sent successfully...");
        req.flash('notify', 'Mail sent successfully...');
        res.redirect(managerUrl);
    }).catch(function(error){
        console.log("error in sendPasswordResetEmail...");
        console.log(error.message);
        req.flash('error', error.message);
        res.redirect(managerUrl);
    });
};

//logout from manager panel
exports.logout = function(req, res) {
    console.log("logout(user.js) called...");

    firebase.auth().signOut().then(function(){
        console.log("logout successfully...");
        req.session = null;
        res.redirect(managerUrl);
    }).catch(function(err){
        console.log("logout(user.js) Error in logout : "+typeof(err.message));
        console.log(err);
        req.flash('error', err.message);
        if ((err.message).indexOf(DENIED) >= 0) {
            res.redirect(managerUrl);
        } else {
            res.redirect('back');
        }
    });
};

exports.profile = function(req, res){
    res.render('profile');
};

exports.updateProfile = function(req, res){
    req.flash('notify', 'This is a test notification 911111.');
    res.redirect('/profile');
};

// Open change password page
exports.changePassword = function(req, res){
    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        res.render('changePassword');
    }
    else {
        res.redirect(managerUrl);
    }
};

// Update password
exports.updatePassword = function(req, res){
    console.log("updatePassword(user.js) called...");

    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);
    //https://firebase.google.com/docs/auth/web/manage-users
    if (currentUser) {

        firebase.auth().currentUser.updatePassword(req.body.new_password).then(function() {
            // Update successful.
            console.log("updatePassword successfully...");

            // res.redirect('/dashboard');

            req.flash('notify', 'Your Password has been changed!');
            res.redirect('/changePassword');

        }).catch(function(error) {
            console.log("error in updatePassword...");
            console.log(error.message);
            req.flash('error', error.message);
            res.redirect('/changePassword');
        });
    }
    else {
        res.redirect(managerUrl);
    }
};

//Open Dahboard page
exports.dashboard = function(req, res){
    console.log("dashboard(user.js) called...");
    session = req.session;
    session.current = 'managerDashboard';

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : "+currentUserId);

        var database = firebase.database();

        var currentUserRef = database.ref('User').child(currentUserId);

        console.log("currentUserRef : "+currentUserRef.toString());

        currentUserRef.once('value',function gotdata(userData){

            if (userData.exists()) {
                var userDataVal = userData.val();

                if (userDataVal.gym) {
                    var gymId = userDataVal.gym.id;

                    console.log("gymId : " + gymId);

                    var gymRef = database.ref('Gyms').child(gymId);

                    console.log("gymRef : ", gymRef.toString());

                    gymRef.once('value', function gotdata(gymData) {

                        if (gymData.exists()) {

                            var gymDataVal = gymData.val();
                            var gymKeys = Object.keys(gymDataVal);

                            var gymCheckIns = gymDataVal["Users"];
                            var avgRate = (gymDataVal.avgRate === undefined ? '0.00' : parseFloat(Math.round(gymDataVal.avgRate * 100) / 100).toFixed(2));

                            var dashboardDict = {};

                            var curr = new Date; // get current date
                            //console.log("curr : "+curr);
                            var options = { year: '2-digit', month: '2-digit', day: '2-digit' };
                            console.log("today :    "+curr.toLocaleString('en-US', options));

                            var mon = curr.getDate() - (curr.getDay() - 1); // First day is the day of the month - the day of the week

                            // console.log("mon : " +mon+"\nmon + 1 : " +(mon + 1)+"\nmon + 2 : " +(mon + 2)+"\nmon + 3 : " +(mon + 3)+"\nmon + 4 : " +(mon + 4)+"\nmon + 5 : " +(mon + 5)+"\nmon + 6 : " +(mon + 6));

                            /*
                            var monday = new Date(curr.setDate(mon));
                            var tueday = new Date(curr.setDate(mon + 1));
                            var wedday = new Date(curr.setDate(mon + 2));
                            var thuday = new Date(curr.setDate(mon + 3));
                            var friday = new Date(curr.setDate(mon + 4));
                            var satday = new Date(curr.setDate(mon + 5));
                            var sunday = new Date(curr.setDate(mon + 6));
                            */

                            var monday = new Date(curr.setDate(curr.getDate() - curr.getDay()+1));
                            var tueday = new Date(curr.setDate(curr.getDate() - curr.getDay()+2));
                            var wedday = new Date(curr.setDate(curr.getDate() - curr.getDay()+3));
                            var thuday = new Date(curr.setDate(curr.getDate() - curr.getDay()+4));
                            var friday = new Date(curr.setDate(curr.getDate() - curr.getDay()+5));
                            var satday = new Date(curr.setDate(curr.getDate() - curr.getDay()+6));
                            var sunday = new Date(curr.setDate(curr.getDate() - curr.getDay()+7));

                            /*
                            console.log("monday : " +monday);
                            console.log("tueday : " +tueday);
                            console.log("wedday : " +wedday);
                            console.log("thuday : " +thuday);
                            console.log("friday : " +friday);
                            console.log("satday : " +satday);
                            console.log("sunday : " +sunday);
                            */

                            var mondayStr = monday.toDateString();
                            var tuedayStr = tueday.toDateString();
                            var weddayStr = wedday.toDateString();
                            var thudayStr = thuday.toDateString();
                            var fridayStr = friday.toDateString();
                            var satdayStr = satday.toDateString();
                            var sundayStr = sunday.toDateString();

                            /*
                            console.log("mondayStr : " +mondayStr);
                            console.log("tuedayStr : " +tuedayStr);
                            console.log("weddayStr : " +weddayStr);
                            console.log("thudayStr : " +thudayStr);
                            console.log("fridayStr : " +fridayStr);
                            console.log("satdayStr : " +satdayStr);
                            console.log("sundayStr : " +sundayStr);
                            */

                            var mondayArray = [];
                            var tuedayArray = [];
                            var weddayArray = [];
                            var thudayArray = [];
                            var fridayArray = [];
                            var satdayArray = [];
                            var sundayArray = [];

                            var WeeklyCheckInData = [];

                            if (gymCheckIns) {
                                var gymCheckInsKeys = Object.keys(gymCheckIns);

                                // console.log("gymCheckInsKeys : " + gymCheckInsKeys);
                                // console.log("gymCheckInsKeys length: " + gymCheckInsKeys.length);

                                var gymCheckInUsers = [];
                                var gymCheckIn = [];

                                for (var i = 0; i < gymCheckInsKeys.length; i++) {
                                    var dict = gymCheckIns[gymCheckInsKeys[i]];
                                    var userId = dict.userId;

                                    if (dict.checkInStatus === 2)
                                    {
                                        gymCheckIn.push(dict);
                                        if (!(gymCheckInUsers.indexOf(userId) > -1))
                                        {
                                            gymCheckInUsers.push(userId);
                                        }
                                        var date = new Date(dict["dateTime"]);

                                        var dateStr = date.toDateString();
                                        // console.log(i+" ,dateStr : "+dateStr);

                                        var gymCoins = parseFloat(dict.gymCoins);

                                        if (!(isNaN(gymCoins))) {
                                            // console.log(i+" @@@@@ gymCoins : "+gymCoins);
                                        }

                                        if (dateStr === mondayStr) {
                                            mondayArray.push(dict);
                                        } else if (dateStr === tuedayStr) {
                                            tuedayArray.push(dict);
                                        } else if (dateStr === weddayStr) {
                                            weddayArray.push(dict);
                                        } else if (dateStr === thudayStr) {
                                            thudayArray.push(dict);
                                        } else if (dateStr === fridayStr) {
                                            fridayArray.push(dict);
                                        } else if (dateStr === satdayStr) {
                                            satdayArray.push(dict);
                                        } else if (dateStr === sundayStr) {
                                            sundayArray.push(dict);
                                        }
                                    }
                                }

/*

                                console.log("mondayArray : " + mondayArray.length);
                                console.log("tuedayArray : " + tuedayArray.length);
                                console.log("weddayArray : " + weddayArray.length);
                                console.log("thudayArray : " + thudayArray.length);
                                console.log("fridayArray : " + fridayArray.length);
                                console.log("satdayArray : " + satdayArray.length);
                                console.log("sundayArray : " + sundayArray.length);
*/
                                var monDict = {
                                    "date": monday.toLocaleString('en-US', options),//mondayStr,//monday.getDate() + '-' + (monday.getMonth()) + '-' + monday.getFullYear(),
                                    "checkIn": mondayArray.length
                                };
                                WeeklyCheckInData.push(monDict);

                                var tueDict = {
                                    "date": tueday.toLocaleString('en-US', options),//tuedayStr,//tueday.getDate() + '-' + (tueday.getMonth()) + '-' + tueday.getFullYear(),
                                    "checkIn": tuedayArray.length
                                };
                                WeeklyCheckInData.push(tueDict);

                                var wedDict = {
                                    "date": wedday.toLocaleString('en-US', options),//weddayStr,//wedday.getDate() + '-' + (wedday.getMonth()) + '-' + wedday.getFullYear(),
                                    "checkIn": weddayArray.length
                                };
                                WeeklyCheckInData.push(wedDict);

                                var thuDict = {
                                    "date": thuday.toLocaleString('en-US', options),//thudayStr,//thuday.getDate() + '-' + (thuday.getMonth()) + '-' + thuday.getFullYear(),
                                    "checkIn": thudayArray.length
                                };
                                WeeklyCheckInData.push(thuDict);

                                var friDict = {
                                    "date": friday.toLocaleString('en-US', options),//fridayStr,//friday.getDate() + '-' + (friday.getMonth()) + '-' + friday.getFullYear(),
                                    "checkIn": fridayArray.length
                                };
                                WeeklyCheckInData.push(friDict);

                                var satDict = {
                                    "date": satday.toLocaleString('en-US', options),//satdayStr,//satday.getDate() + '-' + (satday.getMonth()) + '-' + satday.getFullYear(),
                                    "checkIn": satdayArray.length
                                };
                                WeeklyCheckInData.push(satDict);

                                var sunDict = {
                                    "date": sunday.toLocaleString('en-US', options),//sundayStr,//sunday.getDate() + '-' + (sunday.getMonth()) + '-' + sunday.getFullYear(),
                                    "checkIn": sundayArray.length
                                };
                                WeeklyCheckInData.push(sunDict);

                                dashboardDict = {
                                    totalCheckIns: gymCheckIn.length,
                                    totalUsers: gymCheckInUsers.length,
                                    weekly: WeeklyCheckInData,
                                    gymRating : avgRate
                                };
                            }
                            else
                            {
                                console.log("mondayArray : " + mondayArray.length);
                                console.log("tuedayArray : " + tuedayArray.length);
                                console.log("weddayArray : " + weddayArray.length);
                                console.log("thudayArray : " + thudayArray.length);
                                console.log("fridayArray : " + fridayArray.length);
                                console.log("satdayArray : " + satdayArray.length);
                                console.log("sundayArray : " + sundayArray.length);


                                var monDict1 = {
                                    "date": monday.toLocaleString('en-US', options),//mondayStr,//monday.getDate() + '-' + (monday.getMonth()) + '-' + monday.getFullYear(),
                                    "checkIn": mondayArray.length
                                };
                                WeeklyCheckInData.push(monDict1);

                                var tueDict1 = {
                                    "date": tueday.toLocaleString('en-US', options),//tuedayStr,//tueday.getDate() + '-' + (tueday.getMonth()) + '-' + tueday.getFullYear(),
                                    "checkIn": tuedayArray.length
                                };
                                WeeklyCheckInData.push(tueDict1);

                                var wedDict1 = {
                                    "date": wedday.toLocaleString('en-US', options),//weddayStr,//wedday.getDate() + '-' + (wedday.getMonth()) + '-' + wedday.getFullYear(),
                                    "checkIn": weddayArray.length
                                };
                                WeeklyCheckInData.push(wedDict1);

                                var thuDict1 = {
                                    "date": thuday.toLocaleString('en-US', options),//thudayStr,//thuday.getDate() + '-' + (thuday.getMonth()) + '-' + thuday.getFullYear(),
                                    "checkIn": thudayArray.length
                                };
                                WeeklyCheckInData.push(thuDict1);

                                var friDict1 = {
                                    "date": friday.toLocaleString('en-US', options),//fridayStr,//friday.getDate() + '-' + (friday.getMonth()) + '-' + friday.getFullYear(),
                                    "checkIn": fridayArray.length
                                };
                                WeeklyCheckInData.push(friDict1);

                                var satDict1 = {
                                    "date": satday.toLocaleString('en-US', options),//satdayStr,//satday.getDate() + '-' + (satday.getMonth()) + '-' + satday.getFullYear(),
                                    "checkIn": satdayArray.length
                                };
                                WeeklyCheckInData.push(satDict1);

                                var sunDict1 = {
                                    "date": sunday.toLocaleString('en-US', options),//sundayStr,//sunday.getDate() + '-' + (sunday.getMonth()) + '-' + sunday.getFullYear(),
                                    "checkIn": sundayArray.length
                                };
                                WeeklyCheckInData.push(sunDict1);

                                dashboardDict = {
                                    totalCheckIns: 0,
                                    totalUsers: 0,
                                    weekly: WeeklyCheckInData,
                                    gymRating : avgRate
                                };
                            }

                            var balance = ((gymDataVal.coinBalance === undefined) ? '0' : gymDataVal.coinBalance );

                            dashboardDict.balance = balance;
                            // console.log(WeeklyCheckInData);
                            console.log(dashboardDict);

                            res.render('dashbord', dashboardDict);
                        }

                    }, function errdata(err) {
                        console.log("dashboard(user.js) Error in get gym data : "+typeof(err.message));
                        console.log(err);
                        req.flash('error', err.message);
                        if ((err.message).indexOf(DENIED) >= 0) {
                            res.redirect(managerUrl);
                        } else {
                            res.redirect('back');
                        }
                    });
                }
                else {
                    res.redirect(managerUrl);
                }
            }
        },function errdata(err){
            console.log("dashboard(user.js) Error in get user data : "+typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(managerUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(managerUrl);
    }
};

// Open gym profile page
exports.managerGym = function(req, res){

    var fromArray = constant.fromArray;
    var toArray = constant.toArray;
    var servicesArray = constant.servicesArray;
    var maxImageSize = constant.maxImageSize;

    console.log("fromArray..."+fromArray);
    console.log("toArray..."+toArray);
    console.log("servicesArray..."+servicesArray);
    console.log("maxImageSize..."+maxImageSize);

    session = req.session;
    session.current = 'managerGym';
    console.log("managerGym(user.js) called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : "+currentUserId);

        var database = firebase.database();

        var currentUserRef = database.ref('User').child(currentUserId);

        console.log("currentUserRef : "+currentUserRef.toString());

        currentUserRef.once('value',function gotdata(userData){

            if (userData.exists()) {

                var userDataVal = userData.val();

                console.log("userDataVal.gym...");
                console.log(userDataVal.gym);

                if (userDataVal.gym) {

                    var gymId = userDataVal.gym.id;

                    //console.log("gymId : "+gymId);

                    var gymRef = database.ref('Gyms').child(gymId);

                    //console.log("gymRef : ",gymRef.toString());

                    gymRef.once('value', function gotdata(gymData) {

                        if (gymData.exists()) {
                            var gymDataVal = gymData.val();
                            var gymKeys = Object.keys(gymDataVal);

                            //console.log("gymKeys : "+gymKeys);

                            var gymInfo = gymDataVal;
                            gymInfo.id = gymId;
                            gymInfo.name = ((gymInfo.name === undefined) ? '' : gymInfo.name);
                            gymInfo.address = ((gymInfo.address === undefined) ? '' : gymInfo.address);
                            gymInfo.hoursOfOperation = ((gymInfo.hoursOfOperation === undefined) ? '' : gymInfo.hoursOfOperation);
                            gymInfo.coins = ((gymInfo.coins === undefined) ? '0' : gymInfo.coins);
                            gymInfo.gymBarCode = ((gymInfo.gymBarCode === undefined) ? '' : gymInfo.gymBarCode);
                            gymInfo.Services = ((gymInfo.Services === undefined) ? [] : gymInfo.Services);
                            gymInfo.gymManagerEmail = ((gymInfo.gymManager === undefined) ? 'N/A': ((gymInfo.gymManager.email === undefined) ? 'N/A' : gymInfo.gymManager.email));
                            gymInfo.img = ((gymInfo.img === undefined) ? [] : gymInfo.img);
                            gymInfo.pdf = ((gymInfo.pdf === undefined) ? [] : gymInfo.pdf);

                            var img1, img2, img3 = '';

                            if (gymInfo.img)
                            {
                                if (gymInfo.img.length > 0) {
                                    for (var i= 0 ; i<gymInfo.img.length;i++)
                                    {
                                        if (i === 0)
                                        {
                                            img1 = gymInfo.img[i];
                                        }
                                        if (i === 1)
                                        {
                                            img2 = gymInfo.img[i];
                                        }
                                        if (i === 2)
                                        {
                                            img3 = gymInfo.img[i];
                                        }
                                    }
                                }
                            }

                            gymInfo.img1 = img1;
                            gymInfo.img2 = img2;
                            gymInfo.img3 = img3;

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

                                console.log("##### hours : "+hours);
                                console.log("hoursKey : "+hoursKey);
                                console.log("indexOf : "+indexOf);
                                console.log("from : "+from);
                                console.log("to : "+to);

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
                            console.log(gymInfo);

                            res.render('addGym', {from : fromArray,to : toArray,services : servicesArray, gym : gymInfo ,maxImageSize : maxImageSize});
                        }

                    }, function errdata(err) {
                        console.log("logout(user.js) Error in get gym data : "+typeof(err.message));
                        console.log(err);
                        req.flash('error', err.message);
                        if ((err.message).indexOf(DENIED) >= 0) {
                            res.redirect(managerUrl);
                        } else {
                            res.redirect('back');
                        }
                    });
                }
                else {
                    res.redirect(managerUrl);
                }
            }

        },function errdata(err){
            console.log("managerGym(user.js) Error in get user data : "+typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(managerUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(managerUrl);
    }
};

// Update Gym details
exports.updateGym = function(req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("updateGym(user.js) called...");

    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        // console.log(req.body);
        var filename = "";
        var gymUniqueId = "";
        var imgUrl = [];

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

            console.log("gymRef...", gymRef.toString());

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

            gymRef.update(updateDict);

            req.flash('notify', 'Gym Profile has been updated!');
            res.redirect('/managerGym');
        });
    } else {
        res.redirect(adminUrl);
    }
};

// Open checkIn history list
exports.listCheckIn = function(req, res){
    session = req.session;
    session.current = 'managerCheckIns';
    console.log("listCheckIn(user.js) called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : "+currentUserId);

        var database = firebase.database();

        var currentUserRef = database.ref('User').child(currentUserId);

        console.log("currentUserRef : "+currentUserRef.toString());

        currentUserRef.once('value',function gotdata(userData){

            if (userData.exists()) {
                var userDataVal = userData.val();

                if (userDataVal.gym) {

                    var gymId = userDataVal.gym.id;

                    console.log("gymId : " + gymId);

                    var gymRef = database.ref('Gyms').child(gymId);

                    console.log("gymRef : ", gymRef.toString());

                    gymRef.once('value', function gotdata(gymData) {

                        if (gymData.exists()) {
                            var gymDataVal = gymData.val();
                            var gymKeys = Object.keys(gymDataVal);
                            var gymCheckIns = gymDataVal["Users"];

                            var gymCheckInUsers = [];

                            if (gymCheckIns) {

                                var gymCheckInsKeys = Object.keys(gymCheckIns);

                                console.log("gymCheckInsKeys : " + gymCheckInsKeys);

                                for (var i = 0; i < gymCheckInsKeys.length; i++) {
                                    var dict = gymCheckIns[gymCheckInsKeys[i]];

                                    dict.id = gymCheckInsKeys[i];
                                    dict.gymId = gymId;
                                    dict.userCity = ((dict.userCity === undefined) ? 'N/A' : dict.userCity);
                                    dict.userState = ((dict.userState === undefined) ? 'N/A' : dict.userState);
                                    dict.userProfileImage = ((dict.userProfileImage === undefined) ? placeHolderImgUrl : dict.userProfileImage);
                                    dict.barcodeURL = ((dict.barcodeURL === undefined) ? "" : dict.barcodeURL);
                                    dict.gymCoins = ((dict.gymCoins === undefined) ? "0" : dict.gymCoins);

                                    var date = new Date(dict["dateTime"]);
                                    var formattedDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                                    // console.log(i+"->dateTime : "+dict["dateTime"]+" , date : "+date+" , formattedDate : "+formattedDate);
                                    // console.log(date.toLocaleString());
                                    // dict["dateTime"] = date.toLocaleString();
                                    //https://stackoverflow.com/questions/8888491/how-do-you-display-javascript-datetime-in-12-hour-am-pm-format
                                    // dict.dateTime = date.toLocaleString('en-US', {hour12: true});
                                    dict.dateTimeStamp = dict.dateTime
                                    dict.dateTime = new Date(dict.dateTime).toLocaleString("en-US", {timeZone: "America/New_York"});//.toString();

                                    if (dict.checkInStatus === 2) {
                                        gymCheckInUsers.push(dict);
                                    }
                                }

                                // var sortedArray = gymCheckInUsers.sort(function(obj1, obj2) {
                                //     // Ascending: first age less than the previous
                                //     return obj1.dateTime - obj2.dateTime;
                                // });
                                //
                                // console.log("after gymCheckInUsers..."+sortedArray.length);
                                // console.log(sortedArray);
                                //
                            }
                            // gymCheckInUsers.sort(function(a, b){
                            //     if(a.dateTime < b.dateTime) return -1;
                            //     if(a.dateTime > b.dateTime) return 1;
                            //     return 0;
                            // });
                            gymCheckInUsers.sort(function(x, y){
                                return x.dateTimeStamp - y.dateTimeStamp;
                            })
                            var finalArray = gymCheckInUsers.reverse();

                            console.log("after reverse..." + finalArray.length);
                            console.log(finalArray);

                            res.render('listCheckIn', {result: finalArray});
                        }

                    }, function errdata(err) {
                        console.log("listCheckIn(user.js) Error in get gym data : "+typeof(err.message));
                        console.log(err);
                        req.flash('error', err.message);
                        if ((err.message).indexOf(DENIED) >= 0) {
                            res.redirect(managerUrl);
                        } else {
                            res.redirect('back');
                        }
                    });
                }
            }

        },function errdata(err){
            console.log("listCheckIn(user.js) Error in get user data : "+typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(managerUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(managerUrl);
    }
};

// Open only new checkIns
exports.listNewCheckIn = function(req, res){
    session = req.session;
    session.current = 'managerNewCheckIns';
    console.log("listNewCheckIn(user.js) called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        console.log("currentUserId : "+currentUserId);

        var database = firebase.database();

        var currentUserRef = database.ref('User').child(currentUserId);

        console.log("currentUserRef : "+currentUserRef.toString());

        currentUserRef.once('value',function gotdata(userData){

            if (userData.exists()) {
                var userDataVal = userData.val();

                if (userDataVal.gym) {

                    var gymId = userDataVal.gym.id;

                    console.log("gymId : " + gymId);

                    var gymRef = database.ref('Gyms').child(gymId);

                    console.log("gymRef : ", gymRef.toString());

                    gymRef.once('value', function gotdata(gymData) {

                        if (gymData.exists()) {
                            var gymDataVal = gymData.val();
                            var gymKeys = Object.keys(gymDataVal);

                            var coinBalance = gymDataVal.coinBalance;
                            var gymCheckIns = gymDataVal["Users"];

                            var gymCheckInUsers = [];

                            if (gymCheckIns) {

                                var gymCheckInsKeys = Object.keys(gymCheckIns);

                                console.log("gymCheckInsKeys : " + gymCheckInsKeys);

                                var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

                                console.log("timezone : " + timezone);

                                for (var i = 0; i < gymCheckInsKeys.length; i++) {
                                    var dict = gymCheckIns[gymCheckInsKeys[i]];

                                    dict.id = gymCheckInsKeys[i];
                                    dict.gymId = gymId;
                                    dict.id = gymCheckInsKeys[i];
                                    dict.gymId = gymId;
                                    dict.userCity = ((dict.userCity === undefined) ? 'N/A' : dict.userCity);
                                    dict.userState = ((dict.userState === undefined) ? 'N/A' : dict.userState);
                                    dict.userProfileImage = ((dict.userProfileImage === undefined) ? placeHolderImgUrl : dict.userProfileImage);
                                    dict.barcodeURL = ((dict.barcodeURL === undefined) ? "" : dict.barcodeURL);
                                    dict.gymCoinBalance = coinBalance;

                                    var date = new Date(dict["dateTime"]);
                                    var formattedDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                                    // console.log(i+"->dateTime : "+dict["dateTime"]+" , date : "+date+" , formattedDate : "+formattedDate);
                                    // console.log(date.toLocaleString());
                                    // dict["dateTime"] = date.toLocaleString();
                                    //https://stackoverflow.com/questions/8888491/how-do-you-display-javascript-datetime-in-12-hour-am-pm-format
                                    // dict.dateTime = date.toString();//date.toLocaleString('en-US', {hour12: true});

                                    // dict.dateTime = convertUTCDateToLocalDate(date).toString();
                                    
                                    // dict.dateTime = date.toLocaleString('en-US',{ timeZone: timezone,hour12: true});
                                    dict.dateTimeStamp = dict.dateTime
                                    dict.dateTime = new Date(dict.dateTime).toLocaleString("en-US", {timeZone: "America/New_York"});//.toString();
                                    // console.log("dict..."+i);
                                    // console.log(dict);
                                    if (dict.checkInStatus === 1) {

                                        console.log("date..."+date+" ,dict.dateTime : "+dict.dateTime);

                                        var curr = new Date; // get current date

                                        var hours = Math.abs(date - curr) / 36e5;

                                        console.log("hours..."+hours+" ,(hours >= 12) : "+(hours >= 12));

                                        if (hours <= 12) {
                                            gymCheckInUsers.push(dict);
                                        }
                                    }
                                }

                                // var sortedArray = gymCheckInUsers.sort(function(obj1, obj2) {
                                //     // Ascending: first age less than the previous
                                //     return obj1.dateTime - obj2.dateTime;
                                // });
                                //
                                // console.log("after gymCheckInUsers..."+sortedArray.length);
                                // console.log(sortedArray);
                                //
                            }
                            // gymCheckInUsers.sort(function(a, b){
                            //     if(a.dateTime < b.dateTime) return -1;
                            //     if(a.dateTime > b.dateTime) return 1;
                            //     return 0;
                            // });

                            gymCheckInUsers.sort(function(x, y){
                                return x.dateTimeStamp - y.dateTimeStamp;
                            })

                            var finalArray = gymCheckInUsers.reverse();

                            console.log("after reverse..." + finalArray.length);
                            console.log(finalArray);

                            res.render('listCheckIn', {result: finalArray});
                        }
                        else {
                            var finalArray = [];
                            res.render('listCheckIn', {result: finalArray});
                        }

                    }, function errdata(err) {
                        console.log("listNewCheckIn(user.js) Error in get gym data : "+typeof(err.message));
                        console.log(err);
                        req.flash('error', err.message);
                        if ((err.message).indexOf(DENIED) >= 0) {
                            res.redirect(managerUrl);
                        } else {
                            res.redirect('back');
                        }
                    });
                }
            }

        },function errdata(err){
            console.log("listNewCheckIn(user.js) Error in get user data : "+typeof(err.message));
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(managerUrl);
            } else {
                res.redirect('back');
            }
        });
    }
    else {
        res.redirect(managerUrl);
    }
};

function convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);

    var offset = date.getTimezoneOffset() / 60;
    var hours = date.getHours();

    newDate.setHours(hours - offset);

    return newDate;   
}
//manager checkIn
exports.checkInViaManager = function(req, res){

    var serverTime = firebase.database.ServerValue.TIMESTAMP;

    console.log("checkInViaManager(user.js) called...");

    console.log(req.body);

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var checkInId = req.body.checkInId;
        var gymId = req.body.gymId;
        var barcodeId = req.body.barcodeId;
        var gymCoins = parseFloat(req.body.gymCoins);
        var gymCoinBalance = parseFloat(req.body.gymCoinsBalance);

        console.log("checkInId : " + checkInId + " , gymId : " + gymId + " , barcodeId : " + barcodeId + " ,gymCoins : " + gymCoins + " ,gymCoinBalance : " + gymCoinBalance);

        var database = firebase.database();

        var gymRef = database.ref('Gyms').child(gymId).child('Users').child(checkInId);

        console.log("gymRef : ", gymRef.toString());


        var updateDict = {
            checkInStatus: 2,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid
        };

        console.log("updateDict...");
        console.log(updateDict);

        gymRef.update(updateDict);

        var barcodeRef = database.ref('Gyms').child(gymId).child('Barcodes').child(barcodeId);

        console.log("barcodeRef : ", barcodeRef.toString());

        var updateDict1 = {
            status: 1,
            updatedAt: serverTime,
            updatedBy: req.session.currentUser.uid,
            userId: req.body.userId
        };

        barcodeRef.update(updateDict1);

        var remainingBalance = (gymCoinBalance - gymCoins);
        console.log("remainingBalance : " + remainingBalance);

        if (!isNaN(remainingBalance)) {
            database.ref('Gyms').child(gymId).update({coinBalance: remainingBalance});
        }
        req.flash('notify', 'CheckIn done successfully.');
        res.redirect('/listCheckIn');
    } else {
        res.redirect(managerUrl);
    }
};

//==================== Banking With Stripe ====================

// add banking information page
exports.banking = function(req, res){

    session = req.session;
    session.current = 'banking';

    console.log("banking(user.js) called...");

    var currentUser = req.session.currentUser;
    console.log("currentUser : "+currentUser);

    if (currentUser) {
        var currentUserId = currentUser.uid;
        var database = firebase.database();
        var currentUserRef = database.ref('User/'+currentUserId);
        console.log("currentUserRef : "+currentUserRef.toString());
        currentUserRef.once('value',function gotdata(userData){

            if (userData.exists()) {
                var userDataVal = userData.val();

                // console.log(userDataVal);

                // var customerId = userDataVal.stripe_cust_id
                // console.log("customerId : "+customerId);
                
                var bankObj = {
                    // "customerId" : customerId,
                    "country" : "US",
                    "currency" : "usd",
                    "account_holder_type" : "individual",
                    "routing_number" : "",
                    "account_number" : "",
                    "account_holder_name" : "",
                    "account_exist" : false,
                    "email" : userDataVal.email,
                    "name" : userDataVal.name,
                    "mgrId" : currentUserId,
                    "gymId" : userDataVal.gym.id,
                    "city" : "",
                    "state" : "",
                    "postal_code" : "",
                    "line1" : "",
                    "bday" : "",
                };

                var stripeConnect = userDataVal.stripe_connect_account_id;

                console.log("stripeConnect..."+stripeConnect);

                if (stripeConnect) {
                    stripe_payout.accounts.retrieve(stripeConnect,function(error, account) {
                        // console.log("stripe.accounts.retrieve...");
                        // console.log(error);
                        // console.log("accounts...");
                        // console.log(accounts);
                        if (error) {
                            res.render('addBankInfo',{bankObj});
                        } else {
                            // console.log("account...");
                            // console.log(account);

                            // console.log("external_accounts...");
                            // console.log(account.external_accounts);

                            var day = account.legal_entity.dob.day;
                            var month = account.legal_entity.dob.month;
                            var year = account.legal_entity.dob.year;

                            bankObj.city = account.legal_entity.personal_address.city;
                            bankObj.state = account.legal_entity.personal_address.state;
                            bankObj.postal_code = account.legal_entity.personal_address.postal_code;
                            bankObj.line1 = account.legal_entity.personal_address.line1;
                            bankObj.bday = day+'-'+month+'-'+year;

                            var externalAccountsData = account.external_accounts.data;
                            // console.log("externalAccountsData...",externalAccountsData.length);
                            // console.log(externalAccountsData);

                            if (externalAccountsData.length > 0) {
                                bankObj.account_exist = true;
                                bankObj.country = externalAccountsData[0].country;
                                bankObj.currency = externalAccountsData[0].currency;
                                bankObj.account_holder_type = externalAccountsData[0].account_holder_type;
                                bankObj.routing_number = externalAccountsData[0].routing_number;
                                bankObj.account_holder_name = externalAccountsData[0].account_holder_name;
                                bankObj.account_number = '****' + externalAccountsData[0].last4;

                                // console.log("bankObj...",bankObj.account_holder_type);
                                // console.log(bankObj);

                                res.render('addBankInfo',{bankObj});
                            } else {
                                res.render('addBankInfo',{bankObj});
                            }                          
                        }
                    });
                } else {
                    res.render('addBankInfo',{bankObj});
                }
            }
        }, function errdata(err) {
            console.log("banking(user.js) Error in get user...");
            console.log(err);
            req.flash('error', err.message);
            if ((err.message).indexOf(DENIED) >= 0) {
                res.redirect(managerUrl);
            } else {
                res.redirect('back');
            }
        });
    } else {
        res.redirect(managerUrl);
    }
};

// save bank information details
exports.saveBankInfo = function(req, res){
    console.log("saveBankInfo(user.js) called...");
    console.log(req.body);

    // var serverTime = firebase.database.ServerValue.TIMESTAMP;
    setTimeout(function(){
        createStripeConnectAccountAPICall(req.body,req,res);
    }, 5000);    
};

//API call for add new stripe customer
function createStripeConnectAccountAPICall(params,request,response)
{
    var birthDate = params.birthDate;
    var splitBday = birthDate.split("-");
    
    var date = splitBday[0];
    var month = splitBday[1];
    var year = splitBday[2];

    var url = constant.baseUrl + 'createStripeConnectAccount?email='+params.email+'&country='+params.country+'&first_name='+params.name+'&last_name='+params.name+'&birthDay='+date+'&birthMonth='+month+'&birthYear='+year+'&type=company&city='+params.city+'&address_line1='+params.address+'&postal_code='+params.postalCode+'&state='+params.state+'&ssn_last_4='+params.ssn+'&business_name='+params.business_name+'&business_tax_id='+params.business_tax_id;

    if (params.account_holder_type === 'individual') {
        url = constant.baseUrl + 'createStripeConnectAccount?email='+params.email+'&country='+params.country+'&first_name='+params.name+'&last_name='+params.name+'&birthDay='+date+'&birthMonth='+month+'&birthYear='+year+'&type=company&city='+params.city+'&address_line1='+params.address+'&postal_code='+params.postalCode+'&state='+params.state+'&ssn_last_4='+params.ssn+'&business_name='+params.account_holder_name;
    }
    console.log("url..."+url);
    
    https.get(url, function(res)  {
        res.setEncoding("utf8");
        var body = "";
        res.on("data", function(data) {
            body += data;
        });
        res.on("end", function() {
            body = JSON.parse(body);

            console.log("res.on(end)body..."+body.id);
            console.log(body);

            stripe_payout.tokens.create({
                bank_account: {
                    country: params.country,
                    currency: params.currency,
                    routing_number: params.routing_number,
                    account_number: params.account_number,
                    account_holder_name: params.account_holder_name,
                    account_holder_type: params.account_holder_type
                }
            }, function(errr, token) {

                if (errr) {
                    request.flash('error', errr.message);
                    response.redirect('back');
                } else {
                    // create external account using stripe connect account & bank token
                    stripe_payout.accounts.createExternalAccount(body.id,{ external_account: token.id },
                        function(errrr, bank_account) {

                        if (errrr) {
                            request.flash('error', errrr.message);
                            response.redirect('back');
                        } else {

                            var database = firebase.database();
                            var currentUserRef = database.ref('User/'+params.mgrId);
                            var gymRef = database.ref('Gyms/'+params.gymId);

                            var stripeConnectDict = {
                                "stripe_connect_account_id" : body.id,
                                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                                updatedBy: request.session.currentUser.uid
                            }
                            currentUserRef.update(stripeConnectDict);
                            gymRef.update(stripeConnectDict);

                            request.flash('notify', 'Bank Information added successfully.');
                            response.redirect('back');
                        }
                    });
                }
            });
        });
    });
}