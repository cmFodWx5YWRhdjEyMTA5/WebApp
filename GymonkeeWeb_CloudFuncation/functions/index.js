// firebase deploy --only functions:func1,functions:func2
// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

// Production
var secretKey = "sk_live_JmGIs37x03GszA484DztTfAT";
var secretKey_payout = "sk_live_MbAMJV377NHEuthGGBa6Le2S";

// Developement
// var secretKey = "sk_test_w8tSbojtWALZ2nq8GvRcsoxb";
// var secretKey_payout = "sk_test_d5fERJwscm6qFM4CIMZQE88I";

var stripe = require("stripe")(secretKey);
var stripe_payout = require("stripe")(secretKey);

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const urlBuilder = require('build-url');
const request = require('request-promise');

admin.initializeApp(functions.config().firebase);

const NearByGymsSearchHome = 30 //display nearest 30 miles range gyms [gym Home screen]
const NearByGymsSearchDist = 3000 //display nearest 30 miles range gyms [gym finder screen]
const ZipcodeSearchRadius = 3000 //search gym using zipcode then search nearest 30 miles gym

/*
  Creates a new stripe customer.
  request : email
  response : added stripe customer details
*/
exports.createStripeCustomer = functions.https.onRequest((request, response) => {

  // https://stackoverflow.com/questions/46447966/error-connecting-to-stripe-from-firebase-cloud-function?rq=1
  // https://stackoverflow.com/questions/44024530/stripe-connection-error
  // https://stripe.com/docs/api/node#update_card

  console.log("createStripeCustomer called...");

  var userEmail = request.query.email;
  console.log("UserName : " + userEmail);

  if (userEmail === undefined) {
    console.log("userEmail not entered");

    var resDict = {
      status: -1,
      message: "Email is mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    response.send(finalResDict);
  }
  else {
    console.log("userEmail entered");

    // First read existing users.
    stripe.customers.list(
      { limit: 100 },
      (err, customers) => {
        if (err !== null) {
          response.send(JSON.stringify(err));
        }
        else {
          //console.log("customers : "  + JSON.stringify(customers));
          var isUserAvailable = false
          var existingcustomer = null;
          var customerArray = customers.data;
          console.log("customers.data: " + customers.data);
          for (var cnt = 0; cnt < customerArray.length; cnt++) {
            console.log("customerArray[cnt][email] : " + customerArray[cnt]["email"]);
            console.log("userEmail : " + userEmail);

            if (customerArray[cnt]["email"] === userEmail) {
              existingcustomer = customerArray[cnt];
              isUserAvailable = true;
              break;
            }
          }

          if (isUserAvailable) {
            response.send(JSON.stringify(existingcustomer));
          }
          else {
            // User Not Available
            stripe.customers.create(
              { email: userEmail },

              (err, customer) => {

                console.log("err : " + err);// null if no error occurred
                console.log("customer : " + customer); // the created customer object

                if (err !== null) {
                  response.send(JSON.stringify(err));
                }
                else {
                  response.send(JSON.stringify(customer));
                }
              }
            );
            //res.end( JSON.stringify(isUserAvailable));
          }
        }
      });
  }
});

exports.createStripeConnectAccount = functions.https.onRequest((request, response) => {
  console.log("createStripeConnectAccount called...");
  console.log(request.query);

  var userEmail = request.query.email;
  var country = request.query.country;
  var first_name = request.query.first_name;
  var last_name = request.query.last_name;
  var birthDay = request.query.birthDay;
  var birthMonth = request.query.birthMonth;
  var birthYear = request.query.birthYear;
  var type = request.query.type;
  var city = request.query.city;
  var line1 = request.query.address_line1;
  var postal_code = request.query.postal_code;
  var state = request.query.state;
  // var ssn_last_4 = request.query.ssn_last_4;
  var business_tax_id = request.query.business_tax_id;
  var business_name = request.query.business_name;
  var resDict = {};

  // console.log("userEmail : ",userEmail,(userEmail === undefined));
  // console.log("country : ",country,(country === undefined));
  // console.log("first_name : ",first_name,(first_name === undefined));
  // console.log("last_name : ",last_name,(last_name === undefined));
  // console.log("birthDay : ",birthDay,(birthDay === undefined));
  // console.log("birthMonth : ",birthMonth,(birthMonth === undefined));
  // console.log("birthYear : ",birthYear,(birthYear === undefined));
  // console.log("type : ",type,(type === undefined));
  // console.log("city : ",city,(city === undefined));
  // console.log("line1 : ",line1,(line1 === undefined));
  // console.log("postal_code : ",state,(postal_code === undefined));
  // console.log("state : ",state,(state === undefined));
  // console.log("ssn_last_4 : ",ssn_last_4,(ssn_last_4 === undefined));
  // console.log("business_tax_id : ",business_tax_id,(business_tax_id === undefined));

  // console.log((userEmail === undefined) || (country === undefined) || (first_name === undefined) || 
  // (last_name === undefined) || (birthDay === undefined) || (birthMonth === undefined) || (birthYear === undefined) || 
  // (type === undefined)|| (city === undefined)|| (line1 === undefined)|| (postal_code === undefined)|| (state === undefined)|| 
  // (ssn_last_4 === undefined)|| (business_tax_id === undefined));

  if ((userEmail === undefined) || (country === undefined) || (first_name === undefined) ||
    (last_name === undefined) || (birthDay === undefined) || (birthMonth === undefined) || (birthYear === undefined) ||
    (type === undefined) || (city === undefined) || (line1 === undefined) || (postal_code === undefined) || (state === undefined)) {
    console.log("userEmail not entered");
    resDict.status = -1;
    resDict.message = "Email, Country, first_name, last_name, birthDay, birthMonth, birthYear, type are mandatory.";
    // resDict.data = [];
    response.send(JSON.stringify(resDict));
  } else {//if ((userEmail !== undefined) && (country !== undefined)){
    console.log("userEmail entered");

    // First read existing users.
    stripe_payout.accounts.list({ limit: 100 }, (err, customers) => {
      if (err !== null) {
        response.send(JSON.stringify(err));
      } else {
        var isUserAvailable = false
        var existingcustomer = null;
        var customerArray = customers.data;
        console.log("customers.data: " + customers.data);
        for (var cnt = 0; cnt < customerArray.length; cnt++) {
          console.log("customerArray[cnt][email] : " + customerArray[cnt]["email"]);
          // console.log("userEmail : "  + userEmail);

          if (customerArray[cnt]["email"] === userEmail) {
            existingcustomer = customerArray[cnt];
            isUserAvailable = true;
            break;
          }
        }
        if (isUserAvailable) {
          response.send(JSON.stringify(existingcustomer));
        } else {
          // User Not Available
          stripe_payout.accounts.create({
            type: 'custom',
            country: country,
            email: userEmail,
            legal_entity: {
              business_name: business_name,//'Gymonkee, LLC',
              address: {
                city: city,//"Charlotte",
                // country : "US",
                line1: line1,//"401 Hawthorne Lane, Suite 110 #255",
                line2: null,
                postal_code: postal_code,//"28204",
                state: state//"NC"
              },
              first_name: first_name,
              last_name: last_name,
              dob: {
                day: birthDay,
                month: birthMonth,
                year: birthYear
              },
              personal_address: {
                city: city,
                line1: line1,
                postal_code: postal_code,
                state: state
              },
              business_tax_id: business_tax_id,
              // ssn_last_4 : ssn_last_4,
              type: type
            },
            tos_acceptance: {
              date: Math.floor(Date.now() / 1000),//admin.database.ServerValue.TIMESTAMP,
              ip: request.connection.remoteAddress // Assumes you're not using a proxy
            }
          }, (err, customer) => {

            console.log("err : " + err);// null if no error occurred
            console.log("customer : " + customer); // the created customer object

            if (err !== null) {
              response.send(JSON.stringify(err));
            } else {
              response.send(JSON.stringify(customer));
            }
          });
        }
      }
    });
  }
});

/*
  Add new credit card
  request : customerId :-> stripe customer id,
            cardToken :-> generated card token
  response : added credit card details
*/
exports.addCreditCard = functions.https.onRequest((request, response) => {
  console.log("addCreditCard called...");
  console.log(request.query);

  var customerId = request.query.customerId;
  var cardToken = request.query.cardToken;

  console.log("customerId : " + customerId);
  console.log("cardToken : " + cardToken);

  if ((customerId === undefined) || (cardToken === undefined)) {
    console.log("customerId/cardToken not entered");

    var resDict = {
      status: -1,
      message: "Stripe customer Id and Card token are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    response.send(finalResDict);
  }
  else if ((customerId !== undefined) || (cardToken !== undefined)) {
    stripe.customers.retrieve(customerId, (err, customer) => {
      if (err !== null) {
        response.send(JSON.stringify(err));
      }
      else {
        console.log("customer...");
        console.log(customer);

        stripe.customers.createSource(
          customerId,
          { source: cardToken },
          (error, card) => {

            if (error !== null) {
              response.send(JSON.stringify(error));
            }
            else {
              console.log("card...");
              console.log(card);
              response.send(JSON.stringify(card));
            }
          }
        );
      }
    });
  }
});

/*
  Delete credit card
  request : customerId :-> stripe customer id,
            cardId :-> credit card id
  response : Success
*/
exports.deleteCreditCard = functions.https.onRequest((request, response) => {
  console.log("deleteCreditCard called...");
  console.log(request.query);

  var customerId = request.query.customerId;
  var cardId = request.query.cardId;

  console.log("customerId : " + customerId);
  console.log("cardId : " + cardId);

  if ((customerId === undefined) || (cardId === undefined)) {
    console.log("customerId/cardToken not entered");

    var resDict = {
      status: -1,
      message: "Stripe customer Id and Card Id are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    response.send(finalResDict);
  }
  else if ((customerId !== undefined) || (cardId !== undefined)) {
    stripe.customers.deleteCard(
      customerId,
      cardId,
      (err, confirmation) => {

        if (err !== null) {
          response.send(JSON.stringify(err));
        }
        else {
          response.send(JSON.stringify(confirmation));
        }
      }
    );
  }
});

/*
  Payment using stripe
  request : customerId :-> stripe customer id,
            amount :-> amount for pay,
            description :-> payment description
  response : Success
*/
exports.payWithStripe = functions.https.onRequest((req, res) => {

  console.log("payWithStripe called...");
  console.log(req.query);
  var customerId = req.query.customerId;
  var amount = req.query.amount;
  var description = req.query.description;
  amount = amount * 100;
  console.log("amount : " + amount);
  console.log("description : " + description);

  if ((customerId === undefined) || (amount === undefined) || (description === undefined)) {
    console.log("customerId,amount,description not entered");

    var resDict = {
      status: -1,
      message: "customerId Id , amount and description are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if ((customerId !== undefined) || (amount !== undefined) || (description !== undefined)) {
    console.log("customerId,amount,description entered");

    stripe.charges.create({
      amount: amount,//1600,
      currency: 'usd',
      description: description,
      customer: customerId//customer.id
    }, (err, charge) => {
      if (err !== null) {
        res.send(JSON.stringify(err));
      }
      else {
        res.send(JSON.stringify(charge));
      }
    });
  }
});

/*
  Create stripe Subscription
  request : customerId :-> stripe customer id,
            planId :-> stripe plan id
  response : added stripe Subscription details
*/
exports.createSubscription = functions.https.onRequest((request, response) => {
  console.log("createSubscription called...");
  console.log(request.query);

  var customerId = request.query.customerId;
  var planId = request.query.planId;

  console.log("customerId : " + customerId);
  console.log("planId : " + planId);

  if ((customerId === undefined) || (planId === undefined)) {
    console.log("customerId/planId not entered");

    var resDict = {
      status: -1,
      message: "Stripe customer Id and plan Id are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    response.send(finalResDict);
  }
  else if ((customerId !== undefined) || (planId !== undefined)) {
    console.log("customerId/planId entered");

    stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          plan: planId,
        },
      ]
    }, (err, subscription) => {

      if (err !== null) {
        response.send(JSON.stringify(err));
      }
      else {
        response.send(JSON.stringify(subscription));
      }
    }
    );
  }
});

/*
  Cancel Subscription
  request : subscriptionId :-> stripe subscription id,
  response : cancelled subscription details
*/
exports.cancelSubscription = functions.https.onRequest((request, response) => {
  console.log("cancelSubscription called...");
  console.log(request.query);

  var subscriptionId = request.query.subscriptionId;
  var user_id = request.query.user_id;

  var resDict = {};
  if (subscriptionId === undefined) {

    console.log("subscriptionId not entered");
    resDict.status = -1;
    resDict.message = "Subscription Id is mandatory.";
    response.send(JSON.stringify(resDict));

  } else if (subscriptionId !== undefined) {

    console.log("subscriptionId entered");

    stripe.subscriptions.del(subscriptionId,
      function (err, confirmation) {
        if (err) {
          response.send(JSON.stringify(err));
        } else {
          response.send(JSON.stringify(confirmation));
        }
      });
  }
});

/*
  Retrieve Subscription
  request : subscriptionId :-> stripe subscription id,
  response : subscription details
*/
exports.retrieveSubscription = functions.https.onRequest((request, response) => {
  console.log("retrieveSubscription called...");
  console.log(request.query);

  var subscriptionId = request.query.subscriptionId;
  var resDict = {};
  if (subscriptionId === undefined) {

    console.log("subscriptionId not entered");
    resDict.status = -1;
    resDict.message = "Subscription Id is mandatory.";
    response.send(JSON.stringify(resDict));

  } else if (subscriptionId !== undefined) {

    console.log("subscriptionId entered");

    stripe.subscriptions.retrieve(subscriptionId,
      function (err, confirmation) {
        if (err) {
          response.send(JSON.stringify(err));
        } else {
          response.send(JSON.stringify(confirmation));
        }
      });
  }
});

/*
  provide cards belonging to a customer
  request : customerId :-> stripe customer id,
  response : list of all credit cards
*/
exports.listAllCreditCards = functions.https.onRequest((request, response) => {

  console.log("listAllCreditCards called...");
  console.log(request.query);

  var customerId = request.query.customerId;
  console.log("customerId : " + customerId);

  if (customerId === undefined) {
    console.log("customerId not entered");

    var resDict = {
      status: -1,
      message: "Stripe customer Id is mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    response.send(finalResDict);
  }
  else if (customerId !== undefined) {
    console.log("customerId entered");

    stripe.customers.listCards(customerId, (err, cards) => {

      if (err !== null) {
        response.send(JSON.stringify(err));
      }
      else {
        response.send(JSON.stringify(cards));
      }
    });
  }
});

/*
  get all nearby gyms [Home Screen]
  request : latitude/longitude of user's location
  response : list of all nearby gyms
*/
exports.getGymsHome = functions.https.onRequest((req, res) => {

  console.log("getGyms called...");
  console.log(req.query);

  var latitude = req.query.latitude;
  var longitude = req.query.longitude;

  console.log("latitude : " + latitude + " ,longitude : " + longitude);

  var latitudeVal = parseFloat(req.query.latitude);
  var longitudeVal = parseFloat(req.query.longitude);

  console.log("parseFloat -> latitudeVal : " + latitudeVal + " ,longitudeVal : " + longitudeVal);

  // console.log("latitudeVal isNaN : ",isNaN(latitudeVal));
  // console.log("longitudeVal isNaN : ",isNaN(longitudeVal));

  if ((latitude === undefined) || (longitude === undefined)) {
    console.log("lat/long not entered");

    var resDict = {
      status: -1,
      message: "Latitude and Longitude are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if (isNaN(latitudeVal) || isNaN(longitudeVal)) {
    console.log("lat/long not valid");

    var resDict1 = {
      status: -1,
      message: "Latitude and Longitude are invalid.",
      data: []
    };

    var finalResDict1 = JSON.stringify(resDict1);

    res.send(finalResDict1);
  }
  else //if ((latitude !== undefined) && (longitude !== undefined))
  {
    console.log("lat/long entered");
    const gyms = admin.database().ref('/Gyms').orderByChild('status').equalTo(1)

    gyms.once('value', (snapshot) => {

      var snapshotVal = snapshot.val();
      var keys = Object.keys(snapshotVal);

      var gymData = [];

      for (var i = 0; i < keys.length; i++) {
        // console.log(i+"key : "+keys[i]);

        var dict = snapshotVal[keys[i]];

        var avgRate = dict["avgRate"]

        // console.log("avgRate : ",avgRate);

        if (avgRate === undefined) {
          dict["avgRate"] = 0.0
        }

        delete dict.Rating;
        delete dict.Users;
        delete dict.manager;
        // delete dict.Barcodes;
        delete dict.GymTransaction;

        dict["id"] = keys[i]

        // console.log("dict...",dict);

        var lat = dict["latitude"]
        var long = dict["longitude"]
        var name = dict["name"]
        // console.log(i+"->name : "+name+" ,lat : "+lat+" ,long : "+long);

        var distanceInKm = distance(latitudeVal, longitudeVal, lat, long, 'K')
        var distanceInMiles = distance(latitudeVal, longitudeVal, lat, long, 'M')
        dict["distance"] = distanceInMiles

        var status = dict["status"];

        console.log("name : " + dict["name"] + " ,status : " + status);

        console.log("distanceInKm : ", distanceInKm);
        console.log("distanceInMiles : ", distanceInMiles);
        // console.log("NearByGymsDist : ", NearByGymsDist);
        if (distanceInMiles <= NearByGymsSearchHome) {
          gymData.push(dict);
        }
      }

      console.log("gymData count : " + gymData.length);

      var finalGymData = JSON.stringify(gymData);

      var msg = "No Data found";

      if (gymData.length > 0) {
        msg = "Success";
      }

      // https://stackoverflow.com/questions/6712034/sort-array-by-firstname-alphabetically-in-javascript?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
      gymData.sort(function (a, b) {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        return 0;
      })

      var resDict = {
        status: 1,
        message: msg,
        data: gymData
      };

      // console.log("resDict...");
      // console.log(resDict);

      var finalResDict = JSON.stringify(resDict);

      res.send(finalResDict);

    }, (err) => {
      console.log(err);
      res.send(err);
    });
  }
});

/*
  get all nearby gyms [Search Finder Screen]
  request : latitude/longitude of user's location
  response : list of all nearby gyms
*/
exports.getGyms = functions.https.onRequest((req, res) => {

  console.log("getGyms called...");
  console.log(req.query);

  var latitude = req.query.latitude;
  var longitude = req.query.longitude;

  console.log("latitude : " + latitude + " ,longitude : " + longitude);

  var latitudeVal = parseFloat(req.query.latitude);
  var longitudeVal = parseFloat(req.query.longitude);

  console.log("parseFloat -> latitudeVal : " + latitudeVal + " ,longitudeVal : " + longitudeVal);

  // console.log("latitudeVal isNaN : ",isNaN(latitudeVal));
  // console.log("longitudeVal isNaN : ",isNaN(longitudeVal));

  if ((latitude === undefined) || (longitude === undefined)) {
    console.log("lat/long not entered");

    var resDict = {
      status: -1,
      message: "Latitude and Longitude are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if (isNaN(latitudeVal) || isNaN(longitudeVal)) {
    console.log("lat/long not valid");

    var resDict1 = {
      status: -1,
      message: "Latitude and Longitude are invalid.",
      data: []
    };

    var finalResDict1 = JSON.stringify(resDict1);

    res.send(finalResDict1);
  }
  else //if ((latitude !== undefined) && (longitude !== undefined))
  {
    console.log("lat/long entered");
    const gyms = admin.database().ref('/Gyms').orderByChild('status').equalTo(1)

    gyms.once('value', (snapshot) => {

      var snapshotVal = snapshot.val();
      var keys = Object.keys(snapshotVal);

      var gymData = [];

      for (var i = 0; i < keys.length; i++) {
        // console.log(i+"key : "+keys[i]);

        var dict = snapshotVal[keys[i]];

        var avgRate = dict["avgRate"]

        // console.log("avgRate : ",avgRate);

        if (avgRate === undefined) {
          dict["avgRate"] = 0.0
        }

        delete dict.Rating;
        delete dict.Users;
        delete dict.manager;
        // delete dict.Barcodes;
        delete dict.GymTransaction;

        dict["id"] = keys[i]

        // console.log("dict...",dict);

        var lat = dict["latitude"]
        var long = dict["longitude"]
        var name = dict["name"]
        // console.log(i+"->name : "+name+" ,lat : "+lat+" ,long : "+long);

        var distanceInKm = distance(latitudeVal, longitudeVal, lat, long, 'K')
        var distanceInMiles = distance(latitudeVal, longitudeVal, lat, long, 'M')
        dict["distance"] = distanceInMiles

        var status = dict["status"];

        console.log("name : " + dict["name"] + " ,status : " + status);

        console.log("distanceInKm : ", distanceInKm);
        console.log("distanceInMiles : ", distanceInMiles);
        // console.log("NearByGymsDist : ", NearByGymsDist);
        if (distanceInMiles <= NearByGymsSearchDist) {
          gymData.push(dict);
        }
      }

      console.log("gymData count : " + gymData.length);

      var finalGymData = JSON.stringify(gymData);

      var msg = "No Data found";

      if (gymData.length > 0) {
        msg = "Success";
      }

      // https://stackoverflow.com/questions/6712034/sort-array-by-firstname-alphabetically-in-javascript?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
      gymData.sort(function (a, b) {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        return 0;
      })

      var resDict = {
        status: 1,
        message: msg,
        data: gymData
      };

      // console.log("resDict...");
      // console.log(resDict);

      var finalResDict = JSON.stringify(resDict);

      res.send(finalResDict);

    }, (err) => {
      console.log(err);
      res.send(err);
    });
  }
});

/*
  search gym by city/state/zipcode
  request : searchKey & latitude/longitude of user's location
  response : list of all nearby gyms
*/
exports.searchGymOld = functions.https.onRequest((req, res) => {

  console.log("searchGym called...");
  console.log(req.query);

  var searchKey = req.query.searchKey;
  var latitude = req.query.latitude;
  var longitude = req.query.longitude;

  console.log("latitude : " + latitude + " ,longitude : " + longitude + " ,searchKey : " + searchKey);

  var latitudeVal = parseFloat(req.query.latitude);
  var longitudeVal = parseFloat(req.query.longitude);

  if ((searchKey === undefined) || (latitude === undefined) || (longitude === undefined)) {
    console.log("latitude,longitude and searchKey not entered");

    var resDict = {
      status: -1,
      message: "latitude,longitude and searchKey are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if (isNaN(latitudeVal) || isNaN(longitudeVal)) {
    console.log("lat/long not valid");

    var resDict1 = {
      status: -1,
      message: "Latitude and Longitude are invalid.",
      data: []
    };

    var finalResDict1 = JSON.stringify(resDict1);

    res.send(finalResDict1);
  }
  else if ((searchKey === undefined) || (latitude !== undefined) || (longitude !== undefined)) {
    searchKey = searchKey.toLowerCase();
    console.log("searchKey entered..." + searchKey);
    const gyms = admin.database().ref('/Gyms').orderByChild('status').equalTo(1);

    console.log("gyms : " + gyms.toString());

    gyms.once('value', (snapshot) => {

      var snapshotVal = snapshot.val();
      var keys = Object.keys(snapshotVal);

      var gymData = [];

      for (var i = 0; i < keys.length; i++) {
        var dict = snapshotVal[keys[i]];

        var avgRate = dict["avgRate"]

        if (avgRate === undefined) {
          dict["avgRate"] = 0.0
        }

        delete dict.Rating;
        delete dict.Users;
        delete dict.manager;
        delete dict.GymTransaction;

        dict["id"] = keys[i]

        var lat = dict["latitude"]
        var long = dict["longitude"]

        var distanceInMiles = distance(latitudeVal, longitudeVal, lat, long, 'M')
        dict["distance"] = distanceInMiles

        var state = ((dict.state === undefined) ? 'x' : dict.state.toLowerCase());
        var city = ((dict.city === undefined) ? 'x' : dict.city.toLowerCase());
        var zipcode = ((dict.zipcode === undefined) ? 'x' : dict.zipcode);
        var address = ((dict.address === undefined) ? 'x' : dict.address.toLowerCase());

        console.log("state : " + state + " ,city : " + city + " ,zipcode : " + zipcode + " ,address : " + address);

        console.log("###### indexOf..." + address.indexOf(searchKey) !== -1);

        if ((state === searchKey) || (city === searchKey) || (zipcode === searchKey) || (address.indexOf(searchKey) !== -1)) {
          gymData.push(dict);
        }
      }
      var finalGymData = JSON.stringify(gymData);
      var msg = "No Data found";

      if (gymData.length > 0) {
        msg = "Success";
      }

      var resDict = {
        status: 1,
        message: msg,
        data: gymData
      };

      var finalResDict = JSON.stringify(resDict);
      res.send(finalResDict);
    }, (err) => {
      console.log(err);
      res.send(err);
    });
  }
});

/*
  search gym by city/state/zipcode/address
  All Search options - Results show 30 mile radius of zip code
  request : searchKey & latitude/longitude of user's location
  response : list of all nearby gyms
*/
exports.searchGym = functions.https.onRequest((req, res) => {

  console.log("searchGym called...");
  console.log(req.query);

  var searchKey = req.query.searchKey;
  var latitude = req.query.latitude;
  var longitude = req.query.longitude;

  console.log("latitude : " + latitude + " ,longitude : " + longitude + " ,searchKey : " + searchKey);

  var latitudeVal = parseFloat(req.query.latitude);
  var longitudeVal = parseFloat(req.query.longitude);

  if ((searchKey === undefined) || (latitude === undefined) || (longitude === undefined)) {
    console.log("latitude,longitude and searchKey not entered");

    var resDict = {
      status: -1,
      message: "latitude,longitude and searchKey are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if (isNaN(latitudeVal) || isNaN(longitudeVal)) {
    console.log("lat/long not valid");

    var resDict1 = {
      status: -1,
      message: "Latitude and Longitude are invalid.",
      data: []
    };

    var finalResDict1 = JSON.stringify(resDict1);

    res.send(finalResDict1);
  }
  else if ((searchKey === undefined) || (latitude !== undefined) || (longitude !== undefined)) {
    searchKey = searchKey.toLowerCase();
    console.log("searchKey entered..." + searchKey);
    const gyms = admin.database().ref('/Gyms').orderByChild('status').equalTo(1);

    console.log("gyms : " + gyms.toString());

    gyms.once('value', (snapshot) => {

      var snapshotVal = snapshot.val();
      var keys = Object.keys(snapshotVal);

      var latVal = 0.0;
      var longVal = 0.0;

      var gymData = [];

      if (!isNaN(parseFloat(searchKey))) {
        console.log("any number entered..." + searchKey);
        // https://stackoverflow.com/questions/8276451/remove-truncate-leading-zeros-by-javascript-jquery?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa
        searchKey = Number(searchKey).toString();

        console.log("searchKey after : " + searchKey);

        const zipRef = admin.database().ref('/ZipCode/' + searchKey);
        console.log("zipRef : " + zipRef);
        zipRef.once('value', (zipSnapshot) => {

          if (zipSnapshot.exists()) {
            var zipVal = zipSnapshot.val();
            latVal = zipVal.lat;
            longVal = zipVal.long;

            console.log("latVal : " + latVal + " ,longVal : " + longVal);
          }
          for (var i = 0; i < keys.length; i++) {
            var dict = snapshotVal[keys[i]];

            dict.avgRate = ((dict.avgRate === undefined) ? 0.0 : dict.avgRate);

            delete dict.Rating;
            delete dict.Users;
            delete dict.manager;
            delete dict.GymTransaction;

            dict["id"] = keys[i];

            var lat = dict["latitude"];
            var long = dict["longitude"];

            var distanceInMiles = distance(latitudeVal, longitudeVal, lat, long, 'M')
            dict["distance"] = distanceInMiles;

            var zipcode = ((dict.zipcode === undefined) ? 'x' : dict.zipcode);

            var distanceInMilesWithEnteredZip = distance(latVal, longVal, lat, long, 'M')

            console.log(i + " ### name : " + dict.name + " , distanceInMilesWithEnteredZip : " + distanceInMilesWithEnteredZip);

            if (zipSnapshot.exists()) {
              console.log("exists");
              if (distanceInMilesWithEnteredZip <= ZipcodeSearchRadius) {
                gymData.push(dict);
              }
            }
            else {
              console.log("not exists");
              if (zipcode === searchKey) {
                gymData.push(dict);
              }
            }
          }

          gymData.sort(function (a, b) {
            if (a.distance < b.distance) return -1;
            if (a.distance > b.distance) return 1;
            return 0;
          })

          var finalGymData = JSON.stringify(gymData);
          var msg = "No Data found";

          if (gymData.length > 0) {
            msg = "Success";
          }

          var resDict = {
            status: 1,
            message: msg,
            data: gymData
          };

          var finalResDict = JSON.stringify(resDict);
          res.send(finalResDict);
        }, (err) => {
          console.log(err);
          res.send(err);
        });
      }
      else {
        console.log("any string entered...");
        for (var i = 0; i < keys.length; i++) {
          var dict = snapshotVal[keys[i]];

          dict.avgRate = ((dict.avgRate === undefined) ? 0.0 : dict.avgRate);

          delete dict.Rating;
          delete dict.Users;
          delete dict.manager;
          delete dict.GymTransaction;

          dict["id"] = keys[i]

          var lat = dict["latitude"]
          var long = dict["longitude"]

          var distanceInMiles = distance(latitudeVal, longitudeVal, lat, long, 'M')
          dict["distance"] = distanceInMiles

          var state = ((dict.state === undefined) ? 'x' : dict.state.toLowerCase());
          var city = ((dict.city === undefined) ? 'x' : dict.city.toLowerCase());
          var zipcode = ((dict.zipcode === undefined) ? 'x' : dict.zipcode);
          var address = ((dict.address === undefined) ? 'x' : dict.address.toLowerCase());

          console.log("state : " + state + " ,city : " + city + " ,zipcode : " + zipcode + " ,address : " + address);

          if ((state === searchKey) || (city === searchKey) /*|| (zipcode === searchKey)*/ || (address.indexOf(searchKey) !== -1)) {
            gymData.push(dict);
          }
        }

        gymData.sort(function (a, b) {
          if (a.distance < b.distance) return -1;
          if (a.distance > b.distance) return 1;
          return 0;
        })

        var finalGymData = JSON.stringify(gymData);
        var msg = "No Data found";

        if (gymData.length > 0) {
          msg = "Success";
        }

        var resDict = {
          status: 1,
          message: msg,
          data: gymData
        };

        var finalResDict = JSON.stringify(resDict);
        res.send(finalResDict);
      }
    }, (err) => {
      console.log(err);
      res.send(err);
    });
  }
});

/*
  checkIn in gym
  request : gymId for gym and user who checkIn
  response : Success with two checkIn keys
*/
//================= Not used by Mobile Application
exports.checkInGym = functions.https.onRequest((req, res) => {

  console.log("checkInGym called...");
  console.log(req.query);

  var gymId = req.query.gymId;
  var userId = req.query.userId;

  console.log("gymId : " + gymId + " ,userId : " + userId);

  if ((gymId === undefined) || (userId === undefined)) {
    console.log("gymId/userId not entered");

    var resDict = {
      status: -1,
      message: "GymId and UserId are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if ((gymId !== undefined) || (userId !== undefined)) {
    console.log("gymId/userId entered");
    var gymRef = admin.database().ref('/Gyms').child(gymId)
    var userRef = admin.database().ref('/User').child(userId)

    console.log("gymRef : ", gymRef.toString());
    console.log("userRef : ", userRef.toString());

    gymRef.once('value', (gymSnapshot) => {

      var gymSnapshotVal = gymSnapshot.val();

      console.log("gymSnapshotVal...");
      console.log(gymSnapshotVal);

      userRef.once('value', (userSnapshot) => {

        var userSnapshotVal = userSnapshot.val();

        console.log("userSnapshotVal...");
        console.log(userSnapshotVal);

        var dateTime = new Date().toString();
        console.log("dateTime : ", dateTime);

        var serverTime = admin.database.ServerValue.TIMESTAMP;

        var userCheckInDict = {
          gymId: gymId,
          gymName: gymSnapshotVal["name"],
          // gymAmount : gymSnapshotVal["coins"],
          dateTime: serverTime,
          status: 1,
          createdAt: serverTime,
          createdBy: userId
        }
        console.log("userCheckInDict : ", userCheckInDict);

        var name = userSnapshotVal["firstname"];

        if (userSnapshotVal["lastname"]) {
          name += " " + userSnapshotVal["lastname"];
        }

        var gymCheckInDict = {
          userId: userId,
          userName: name,
          dateTime: serverTime,
          status: 1,
          createdAt: serverTime,
          createdBy: userId
        }
        console.log("gymCheckInDict : ", gymCheckInDict);

        return userRef.child("CheckIn").push(userCheckInDict).then((user) => {

          var userRefArray = user.path.pieces_;
          var pushUserId = userRefArray[userRefArray.length - 1];
          console.log("user CheckIn ref : ", userRefArray, userRefArray.length);
          console.log("pushUserId : ", pushUserId);

          return gymRef.child("Users").push(gymCheckInDict).then((gym) => {

            var gymRefArray = gym.path.pieces_;
            var pushGymId = gymRefArray[gymRefArray.length - 1];
            console.log("gym CheckIn ref : ", gymRefArray, gymRefArray.length);
            console.log("pushGymId : ", pushGymId);

            var data = {
              checkInId_User: pushUserId,
              checkInId_Gym: pushGymId
            }

            var resDict = {
              status: 1,
              message: "CheckIn done Successfully.",
              data: data
            };

            var finalResDict = JSON.stringify(resDict);

            return res.send(finalResDict);

          }, (err) => {
            console.log(err);
            res.send(err);
          });

        }, (err) => {
          console.log(err);
          res.send(err);
        });

      }, (err) => {
        console.log(err);
        res.send(err);
      });

    }, (err) => {
      console.log(err);
      res.send(err);
    });
  }
});

/*
  checkIn in gym
  request : gymId for gym and user who checkIn
  response : Success with two checkIn keys
*/
//================= Not used by Mobile Application
exports.checkInGymNew = functions.https.onRequest((req, res) => {

  console.log("checkInGymNew called...");
  console.log(req.query);

  var gymId = req.query.gymId;
  var userId = req.query.userId;
  var checkInFromApp = req.query.checkInFromApp;

  console.log("gymId : " + gymId + " ,userId : " + userId + " ,checkInFromApp : " + checkInFromApp);
  console.log(typeof checkInFromApp);
  console.log(isNaN(checkInFromApp));

  var checkInFromAppInt = parseInt(checkInFromApp);
  console.log(typeof checkInFromAppInt);
  console.log(isNaN(checkInFromAppInt));

  if ((gymId === undefined) || (userId === undefined) || (checkInFromApp === undefined)) {
    console.log("gymId/userId/checkInFromApp not entered");

    var resDict = {
      status: -1,
      message: "GymId, UserId and checkInFromApp are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if (isNaN(checkInFromAppInt)) {
    console.log("checkInFromApp not valid");

    var resDict2 = {
      status: -1,
      message: "CheckInFromApp should be integer either 0 or 1.",
      data: []
    };

    var finalResDict2 = JSON.stringify(resDict2);

    res.send(finalResDict2);
  }
  else if ((gymId !== undefined) || (userId !== undefined) || (checkInFromApp !== undefined)) {
    console.log("gymId/userId/checkInFromApp entered");
    var gymRef = admin.database().ref('/Gyms').child(gymId)
    var userRef = admin.database().ref('/User').child(userId)

    console.log("gymRef : ", gymRef);
    console.log("userRef : ", userRef);

    gymRef.once('value', (gymSnapshot) => {

      var gymSnapshotVal = gymSnapshot.val();

      console.log("gymSnapshotVal...");
      console.log(gymSnapshotVal);
      console.log("checkInFromAppInt : " + checkInFromAppInt);

      if (checkInFromAppInt === 0) {
        var gymBarcodes = gymSnapshotVal["Barcodes"];

        console.log("gymBarcodes...");
        console.log(gymBarcodes);

        if (gymBarcodes === undefined) {
          var resDict1 = {
            status: -1,
            message: "No Barcodes Available",
            data: []
          };
          var finalResDict1 = JSON.stringify(resDict1);
          res.send(finalResDict1);
        }
        else {
          var gymBarcodesKeys = Object.keys(gymBarcodes);
          console.log("gymBarcodesKeys : " + gymBarcodesKeys);

          var barcodeData = {};
          var barcodeDataKey = Object.keys(barcodeData);

          for (var i = 0; i < gymBarcodesKeys.length; i++) {
            var dict = gymBarcodes[gymBarcodesKeys[i]];
            dict["id"] = gymBarcodesKeys[i];

            console.log(i + " ,status : " + dict.status + " , barcodeDataKey : " + barcodeDataKey.length);
            console.log((dict.status === 1) && (barcodeDataKey.length === 0));

            if ((dict.status === 1) && (barcodeDataKey.length === 0)) {
              barcodeData = dict;
              barcodeDataKey = Object.keys(barcodeData);
            }
          }
          barcodeDataKey = Object.keys(barcodeData);
          console.log("barcodeData..." + barcodeDataKey.length);
          console.log(barcodeData);

          if (barcodeDataKey.length > 0) {
            userRef.once('value', (userSnapshot) => {

              var userSnapshotVal = userSnapshot.val();
              console.log("userSnapshotVal...");
              console.log(userSnapshotVal);

              var dateTime = new Date().toString();
              console.log("dateTime : ", dateTime);

              var serverTime = admin.database.ServerValue.TIMESTAMP;

              var userCheckInDict = {
                gymId: gymId,
                gymName: gymSnapshotVal["name"],
                // gymAmount : gymSnapshotVal["coins"],
                dateTime: serverTime,
                status: 1,
                createdAt: serverTime,
                createdBy: userId,
                checkInStatus: 1
              }
              console.log("userCheckInDict : ", userCheckInDict);

              var name = userSnapshotVal["firstname"];

              if (userSnapshotVal["lastname"]) {
                name += " " + userSnapshotVal["lastname"];
              }

              var gymCheckInDict = {
                userId: userId,
                userName: name,
                dateTime: serverTime,
                status: 1,
                createdAt: serverTime,
                createdBy: userId,
                checkInStatus: 1
              }
              console.log("gymCheckInDict : ", gymCheckInDict);

              return userRef.child("CheckIn").push(userCheckInDict).then((user) => {

                var userRefArray = user.path.pieces_;
                var pushUserId = userRefArray[userRefArray.length - 1];
                console.log("user CheckIn ref : ", userRefArray, userRefArray.length);
                console.log("pushUserId : ", pushUserId);

                return gymRef.child("Users").push(gymCheckInDict).then((gym) => {

                  var gymRefArray = gym.path.pieces_;
                  var pushGymId = gymRefArray[gymRefArray.length - 1];
                  console.log("gym CheckIn ref : ", gymRefArray, gymRefArray.length);
                  console.log("pushGymId : ", pushGymId);

                  var data = {
                    Barcode: barcodeData,
                    checkInId_User: pushUserId,
                    checkInId_Gym: pushGymId
                  }
                  var resDict4 = {
                    status: 1,
                    message: "Success",
                    data: data
                  };

                  var finalResDict4 = JSON.stringify(resDict4);

                  return res.send(finalResDict4);

                  /*
                  var resDict = {
                    status: 1,
                    message: "CheckIn done Successfully.",
                    data : data
                  };

                  var finalResDict = JSON.stringify(resDict);

                  return res.send(finalResDict);
                  */

                }, (err) => {
                  console.log(err);
                  res.send(err);
                });
              }, (err) => {
                console.log(err);
                res.send(err);
              });
            }, (err) => {
              console.log(err);
              res.send(err);
            });
          }
          else {
            var resDict3 = {
              status: -1,
              message: "No Barcodes Available",
              data: []
            };

            var finalResDict3 = JSON.stringify(resDict3);

            res.send(finalResDict3);
          }
        }
      }
      else if (checkInFromAppInt === 1) {
        res.send(checkInFromApp);
      }
    }, (err) => {
      console.log(err);
      res.send(err);
    });
  }
});

/*
  Rate to gym
  request : gymId for gym ,user who rate,checkIn ids,rate & rate rateComment
  response : Success
*/
exports.rateGym = functions.https.onRequest((req, res) => {

  console.log("rateGym called...");
  console.log(req.query);

  var gymId = req.query.gymId;
  var userId = req.query.userId;
  var rate = req.query.rate;
  var checkInId_User = req.query.checkInId_User;
  var checkInId_Gym = req.query.checkInId_Gym;
  var rateComment = req.query.rateComment;

  console.log("gymId : " + gymId + " ,userId : " + userId + " , rate : " + rate + " , checkInId_User : " + checkInId_User + " , checkInId_Gym : " + checkInId_Gym + " ,rateComment : " + rateComment);

  console.log("rate type : ", typeof (rate));

  var rateVal = parseFloat(rate);

  console.log("rateVal type : ", typeof (rateVal));

  console.log(isNaN(rateVal));

  if ((gymId === undefined) || (userId === undefined) || (rate === undefined) || (checkInId_User === undefined) || (checkInId_Gym === undefined) || (rateComment === undefined)) {
    console.log("gymId/userId not entered");

    var resDict = {
      status: -1,
      message: "GymId,UserId,rate,rateComment and checkIn Ids are mandatory.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);

    res.send(finalResDict);
  }
  else if (isNaN(rateVal)) {
    console.log("rate not valid");

    var resDict1 = {
      status: -1,
      message: "Rate is invalid.",
      data: []
    };

    var finalResDict1 = JSON.stringify(resDict1);

    res.send(finalResDict1);
  }
  else if (rateVal > 5) {
    console.log("rate not valid");

    var resDict2 = {
      status: -1,
      message: "Rate should be less than or equal to 5.",
      data: []
    };

    var finalResDict2 = JSON.stringify(resDict2);

    res.send(finalResDict2);
  }
  else if ((gymId !== undefined) || (userId !== undefined) || (rate !== undefined) || (rateComment !== undefined)) {
    console.log("gymId/userId/rate/rateComment entered");
    var gymRef = admin.database().ref('/Gyms').child(gymId).child("Users").child(checkInId_Gym);
    var userRef = admin.database().ref('/User').child(userId).child("CheckIn").child(checkInId_User);

    console.log("gymRef : ", gymRef.toString());
    console.log("userRef : ", userRef.toString());

    var serverTime = admin.database.ServerValue.TIMESTAMP;

    var dateTime = new Date().toString();
    console.log("dateTime : ", dateTime);

    var userRateDict = {
      rateAt: serverTime,
      rate: rateVal,
      rateComment: rateComment,
      updatedAt: serverTime,
      updatedBy: userId
    }

    console.log("userRateDict : ", userRateDict);

    gymRef.update(userRateDict);
    userRef.update(userRateDict);

    var gymData = admin.database().ref('/Gyms').child(gymId)

    console.log("gymData : " + gymData.toString());

    gymData.once('value', (gymSnapshot) => {

      var gymSnapshotVal = gymSnapshot.val();

      console.log("gymSnapshotVal...");
      console.log(gymSnapshotVal);

      var ratingData = gymSnapshotVal["Users"];

      console.log("ratingData...", ratingData);
      console.log(ratingData !== undefined);

      if (ratingData !== undefined) {
        console.log(ratingData);

        var ratingKeys = Object.keys(ratingData);
        console.log("ratingKeys : ", ratingKeys, ratingKeys.length);

        var rateArray = [];
        var rateTotal = 0.0;
        console.log("rateTotal : " + rateTotal);
        for (var i = 0; i < ratingKeys.length; i++) {
          var dict = ratingData[ratingKeys[i]];
          var rate1 = parseFloat(dict["rate"]);
          console.log(i + " ,rate1 : " + rate1 + " , (!(isNaN(rate1))) : " + (!(isNaN(rate1))));
          if (!(isNaN(rate1))) {
            rateTotal += rate1;
            rateArray.push(dict);
            console.log(i + " ,rateTotal : ", rateTotal);
          }
        }
        console.log("rateArray.length : " + rateArray.length);
        var avgRate = (rateTotal / (rateArray.length));
        console.log("avgRate : ", avgRate);
        var avgRateDict = { avgRate: avgRate };

        gymData.update(avgRateDict);
      }
      else {
        var avgRateDict1 = { avgRate: rateVal };

        gymData.update(avgRateDict1);
      }

      var resDictFinal = {
        status: 1,
        message: "Rating done Successfully.",
      };

      var finalResDictFinal = JSON.stringify(resDictFinal);

      return res.send(finalResDictFinal);

    }, (err) => {
      console.log(err);
      res.send(err);
    });

    // gymRef.once('value',(gymSnapshot)=>{
    //
    //   var gymSnapshotVal = gymSnapshot.val();
    //
    //   console.log("gymSnapshotVal...");
    //   console.log(gymSnapshotVal);
    //
    //   var ratingData = gymSnapshotVal["Rating"];
    //
    //   console.log("ratingData...",ratingData);
    //   console.log(ratingData !== undefined);
    //
    //   if (ratingData !== undefined)
    //   {
    //     console.log(ratingData);
    //
    //     var ratingKeys = Object.keys(ratingData);
    //     console.log("ratingKeys : ",ratingKeys,ratingKeys.length);
    //
    //     var rateTotal = rateVal;
    //     for (var i = 0; i < ratingKeys.length ; i++)
    //     {
    //       var dict = ratingData[ratingKeys[i]];
    //       var rate1 = parseFloat(dict["rate"]);
    //       rateTotal += rate1;
    //       console.log(i+" ,rate1 : ",rate1);
    //       console.log(i+" ,rateTotal : ",rateTotal);
    //     }
    //     var avgRate = (rateTotal / (ratingKeys.length + 1));
    //     console.log("avgRate : ",avgRate);
    //     var avgRateDict = {avgRate : avgRate};
    //
    //     gymRef.update(avgRateDict);
    //   }
    //   else {
    //     var avgRateDict1 = {avgRate : rateVal};
    //
    //     gymRef.update(avgRateDict1);
    //   }
    //
    //   userRef.once('value',(userSnapshot)=>{
    //
    //     var userSnapshotVal = userSnapshot.val();
    //
    //     console.log("userSnapshotVal...");
    //     console.log(userSnapshotVal);
    //
    //     var dateTime = new Date().toString();
    //     console.log("dateTime : ",dateTime);
    //
    //     var userRateDict = {
    //       gymId : gymId,
    //       gymName : gymSnapshotVal["name"],
    //       dateTime : dateTime,
    //       rate : rateVal
    //     }
    //     console.log("userRateDict : ",userRateDict);
    //
    //     var name = userSnapshotVal["firstname"];
    //
    //     if (userSnapshotVal["lastname"])
    //     {
    //       name += " " + userSnapshotVal["lastname"];
    //     }
    //
    //     var gymRateDict = {
    //       userId : userId,
    //       userName : name,
    //       dateTime : dateTime,
    //       rate : rateVal
    //     }
    //     console.log("gymRateDict : ",gymRateDict);
    //
    //     return userRef.child("Rating").push(userRateDict).then((user)=> {
    //
    //       return gymRef.child("Rating").push(gymRateDict).then((gym)=> {
    //
    //         var resDict = {
    //           status: 1,
    //           message: "Rating done Successfully.",
    //         };
    //
    //         var finalResDict = JSON.stringify(resDict);
    //
    //         return res.send(finalResDict);
    //
    //       },(err)=>{
    //         console.log(err);
    //         res.send(err);
    //       });
    //
    //     },(err)=>{
    //       console.log(err);
    //       res.send(err);
    //     });
    //
    //   },(err)=>{
    //     console.log(err);
    //     res.send(err);
    //   });
    //
    // },(err)=>{
    //   console.log(err);
    //   res.send(err);
    // });
  }
});

exports.friendContactList = functions.https.onRequest((req, res) => {

  console.log("friendContactList API called...");

  var inputUserId = req.body.userId;
  var contactList = req.body.contactList;

  if ((contactList === undefined) || (contactList.count === 0) || (inputUserId === undefined)) {
    var message = "Contact list not find.";
    if (inputUserId === undefined) {
      message = "userId is missing";
    }
    console.log("contactList not find");

    var resDict = {
      status: -1,
      message: "Contact list not find.",
      data: []
    };

    var finalResDict = JSON.stringify(resDict);
    return res.send(finalResDict);
  }
  else {

    // Fetch User Data
    var userRef = admin.database().ref('/User')
    userRef.once('value', (userSnapshot) => {

      if (userSnapshot.exists()) {
        // Fetch Friend Data
        var friendRef = admin.database().ref('/Friendship').child(inputUserId)
        console.log("Finding Friends at = " + friendRef);

        var keysfriendSnapshotVal = []
        friendRef.once('value', (friendSnapshot) => {

          if (friendSnapshot.exists()) {

            var friendSnapshotVal = friendSnapshot.val();
            keysfriendSnapshotVal = Object.keys(friendSnapshotVal);
            console.log("Find Friend (" + keysfriendSnapshotVal + ") data of User ======");

            return keysfriendSnapshotVal;
          }
          else {
            console.log("Friend not found");
            return [];
          }

        }).then(function () {

          var snapshotVal = userSnapshot.val();
          var userKeys = Object.keys(snapshotVal);
          console.log(keysfriendSnapshotVal.count);
          console.log("=============== keysfriendSnapshotVal found ================================");
          // Get User details 
          for (var counter = 0; counter < userKeys.length; counter++) {

            var userId = userKeys[counter];
            var userSnapshotValue = snapshotVal[userKeys[counter]];
            var userEmail = userSnapshotValue["email"];
            //console.log("userId =" + userId);

            // Get Contact List Details
            for (var cnt = 0; cnt < contactList.length; cnt++) {

              var friendContactDict = contactList[cnt];
              var friendContactEmailsArray = friendContactDict["emailAddresses"];
              if (friendContactEmailsArray === undefined) {
                //console.log("friendContactEmailsArray Not Available...");
              } else {

                // get contact Email Array
                for (var emailCnt = 0; emailCnt < friendContactEmailsArray.length; emailCnt++) {

                  var friendEmail = friendContactEmailsArray[emailCnt];
                  //console.log("friendEmail..." + friendEmail);

                  if (friendEmail["email"] === undefined) {
                    //console.log("Email Not Available...");
                  }
                  else if (friendEmail["email"] === userEmail) {

                    contactList[cnt]["userId"] = userId;
                    console.log("User Already Exist database ======...");
                    for (var friendCounter = 0; friendCounter < keysfriendSnapshotVal.length; friendCounter++) {
                      console.log("Friend Id : " + keysfriendSnapshotVal[friendCounter]);
                      var friendId = keysfriendSnapshotVal[friendCounter];

                      if (userId === friendId) {
                        contactList[cnt]["isFriend"] = "1";
                        console.log("User is Already friend ======...");
                        break;
                      }
                    }
                  }
                  else {
                    //console.log("User Email not found XXXXXXX. "+ userEmail);
                  }
                }
              }
              var userPhoneTemp = userSnapshotValue["phone_number"]
              if (userPhoneTemp === undefined) {
                //console.log("user number Not Available...");
              } else {
                userPhoneTemp = userPhoneTemp.replace(" ", "");
                userPhoneTemp = userPhoneTemp.replace("-", "");
                userPhoneTemp = userPhoneTemp.replace("(", "");
                var userPhone = userPhoneTemp.replace(")", "");
                //console.log("userPhone...");
                //console.log(userPhone);
                var friendContactPhonesArray = friendContactDict["phoneNumbers"];
                if (friendContactPhonesArray === undefined) {
                  //console.log("friendContactPhonesArray Not Available...");
                } else {
                  for (var phoneCnt = 0; phoneCnt < friendContactPhonesArray.length; phoneCnt++) {
                    var friendPhone = friendContactPhonesArray[phoneCnt];
                    var frdContactPhone = friendPhone["number"];
                    frdContactPhone = frdContactPhone.replace(" ", "");
                    frdContactPhone = frdContactPhone.replace("-", "");
                    frdContactPhone = frdContactPhone.replace("(", "");
                    var friendContactPhone = frdContactPhone.replace(")", "");

                    //console.log("friendPhone...");
                    //console.log(friendPhone);

                    if (friendContactPhone === undefined) {
                      console.log("number Not Available...");
                    } else if (friendContactPhone === userPhone) {
                      contactList[cnt]["userId"] = userId;
                      console.log("User Already Exisit ======...");
                      for (var friendPhoneCounter = 0; friendPhoneCounter < keysfriendSnapshotVal.length; friendPhoneCounter++) {
                        console.log(
                          friendPhoneCounter +
                          "key : " +
                          keysfriendSnapshotVal[friendPhoneCounter]
                        );
                        var friendPhoneId =
                          keysfriendSnapshotVal[friendPhoneCounter];
                        if (userId === friendPhoneId) {
                          contactList[cnt]["isFriend"] = "1";
                          console.log("User is Already friend ======...");
                          break;
                        }
                      }
                    } else {
                      //console.log("User Email not found XXXXXXX. "+ userEmail);
                    }
                  }
                }
              }
            }
          }

          // sort by givenName i.e first name
          contactList.sort(function (a, b) {
            var nameA = a.givenName.toUpperCase(); // ignore upper and lowercase
            var nameB = b.givenName.toUpperCase(); // ignore upper and lowercase
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }

            // names must be equal
            return 0;
          });
          var resultContactList = JSON.stringify(contactList);
          return res.send(contactList);
        }).catch((error) => {
          console.error('Error while changes Contact data:', error);
          var resDict = {
            status: -1,
            message: 'Error while changes Contact data: ' + error,
            data: []
          };
          var finalResDict = JSON.stringify(resDict);
          return res.status(403).send(finalResDict);
        });

      } else {
        console.error('User Not found');
        var resDict = {
          status: -1,
          message: 'User Not found',
          data: []
        };
        var finalResDict = JSON.stringify(resDict);
        return res.status(403).send(finalResDict);
      }
    }).catch((error) => {
      console.error('Error in user Fetching data:', error);
      var resDict = {
        status: -1,
        message: 'Error in user Fetching data: ' + error,
        data: []
      };
      var finalResDict = JSON.stringify(resDict);
      return res.status(403).send(finalResDict);
    });
  }
});


/*
https://github.com/firebase/functions-samples/blob/master/quickstarts/email-users/functions/index.js
https://github.com/firebase/functions-samples/blob/master/email-confirmation/functions/index.js

https://github.com/jokamjohn/DynamicLinks_with_Firebase_cloud_functions/blob/master/functions/index.js
https://medium.com/the-andela-way/creating-firebase-dynamic-links-with-firebase-cloud-functions-e96d1713530f

https://firebase.google.com/docs/reference/dynamic-links/link-shortener
*/

exports.postDynamicLinkNew = functions.database.ref('User/{userId}').onWrite(event => {

  console.log("@@@@@@@@@@ postDynamicLink called newest...");

  let post = event.data.val();
  console.log(post);

  if (post) {
    const userId = event.params.userId;

    console.log("userId : " + userId);

    if (post.inviteURL && post.inviteCode) {
      return post;
    }

    // var request = require("request");
    var rString = randomString(8, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
    console.log("rString..." + rString);
    var options =
    {
      method: 'POST',
      url: 'https://firebasedynamiclinks.googleapis.com/v1/shortLinks',
      qs: { key: `${functions.config().applinks.key}` },
      headers:
      {
        'Content-Type': 'application/json'
      },
      body:
      {
        dynamicLinkInfo:
        {
          dynamicLinkDomain: `${functions.config().applinks.link}`,
          link: 'https://www.gymonkee.com/&utmCampaign=' + rString,
          androidInfo:
          {
            androidPackageName: 'com.gymonkee',
            androidMinPackageVersionCode: ''
          },
          iosInfo:
          {
            iosBundleId: 'com.gymonkee',
            iosCustomScheme: 'com.gymonkee',
            iosIpadBundleId: 'com.gymonkee',
            iosAppStoreId: '1372122874'
          },
          navigationInfo: { enableForcedRedirect: true },
          analyticsInfo:
          {
            googlePlayAnalytics:
            {
              utmSource: 'https://www.gymonkee.com/',
              utmMedium: 'friendship',
              utmCampaign: rString
            }
          }
        },
        suffix: { option: 'SHORT' }
      },
      json: true
    };

    // console.log("options...");
    // console.log(options);

    // request(options, function (error, response, body) {

    //   console.log("##########API response...");
    //   // console.log("error...");
    //   // console.log(error);
    //   // console.log("response...");
    //   // console.log(response);
    //   // console.log("body...");
    //   // console.log(body);

    //   if (error) throw new Error(error);

    //   console.log("body...");
    //   console.log(body);
    //   console.log("shortLink..."+body.shortLink);

    //   post.inviteURL = body.shortLink;
    //   post.shortInviteURL = body.shortLink;
    //   post.inviteCode = rString;
    //   console.log("post..."+event.data.ref.toString());
    //   console.log(post);
    //   return event.data.ref.set(post);
    // });

    return request(options)
      .then((parsedBody) => {
        console.log("parsedBody...");
        console.log(parsedBody);
        return parsedBody.shortLink;
      })
      .then((shortLink) => {
        post.inviteURL = shortLink;
        // post.shortInviteURL = shortLink;
        post.inviteCode = rString;
        console.log('short link: ' + shortLink);
        return event.data.ref.set(post);
      })
  } else {
    return null;
  }
});

// Not used...
/*
exports.postDynamicLinkOld = functions.database.ref('User/{userId}').onWrite(event => {

  console.log("postDynamicLink called...");
  
  let post = event.data.val();
  console.log(post);

  if (post) {
    const userId = event.params.userId;

    console.log("userId : "+userId);

    if (post.inviteURL && post.shortInviteURL && post.inviteCode) {
      return post;
    }

    const socialDescription = `Arvana Blog - ${post.email}`;
    const socialImageUrl = "http://res.cloudinary.com/jokam/image/upload/v1498378886/ar_blog_qeqjzu.png";

    var rString = randomString(8, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

    const options = {
      method: 'POST',
      uri: `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${functions.config().applinks.key}`,
      body: {
          "longDynamicLink": makeDynamicLongLink(userId, socialDescription, socialImageUrl,rString)
      },
      json: true
    };

    console.log("options...");
    console.log(options);

    return request(options)
    .then( (parsedBody) => {
      console.log("parsedBody...");
      console.log(parsedBody);
      return parsedBody.shortLink;
    })
    .then((shortLink) => {
      post.inviteURL = options.body.longDynamicLink;//shortLink;
      post.shortInviteURL = shortLink//options.body.longDynamicLink;
      post.inviteCode = rString;
      console.log('short link: ' + shortLink);
      return event.data.ref.set(post);
    })
  } else {
    return null;
  }
});

function makeDynamicLongLink(postId, socialDescription, socialImageUrl,rString) {
    return urlBuilder(`${functions.config().applinks.link}`, {
        queryParams: {
            link: "https://www.gymonkee.com/" + postId,
            apn: "com.gymonkee",
            dfl: "https://www.gymonkee.com/",
            st: "Gymonkee",
            "utmMedium": "friendship",
            "utmCampaign": rString,
            // utmSource : rString,
            // sd: socialDescription,
            // si: socialImageUrl
            "androidInfo": {
              "androidPackageName": "com.gymonkee",
              // "androidFallbackLink": "string",
              // "androidMinPackageVersionCode": "string",
              // "androidLink": "string"
            },
            "iosInfo": {
              "iosBundleId": "com.gymonkee",
              "iosFallbackLink": "https://itunes.apple.com/us/app/gymonkee/id1372122874?mt=8",
              "iosCustomScheme": "com.gymonkee",
              // "iosIpadFallbackLink": "string",
              // "iosIpadBundleId": "string",
              "iosAppStoreId": "1372122874"
            },
            "analyticsInfo": {
              "googlePlayAnalytics": {
                // "utmSource": rString,
                "utmMedium": "friendship",
                "utmCampaign": rString,
                // "utmTerm": string,
                // "utmContent": string,
                // "gclid": string
              },
              // "itunesConnectAnalytics": {
              //   "at": string,
              //   "ct": string,
              //   "mt": string,
              //   "pt": string
              // }
            },
        }
    });
}
*/

// https://www.geodatasource.com/developers/javascript
function distance(lat1, lon1, lat2, lon2, unit) {
  var radlat1 = Math.PI * lat1 / 180
  var radlat2 = Math.PI * lat2 / 180
  var theta = lon1 - lon2
  var radtheta = Math.PI * theta / 180
  var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  dist = Math.acos(dist)
  dist = dist * 180 / Math.PI
  dist = dist * 60 * 1.1515
  if (unit === "K") { dist = dist * 1.609344 }
  if (unit === "N") { dist = dist * 0.8684 }
  return dist
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
