var cron = require('node-cron');
var everyDay = '0 0 0 * * *'
var everySecond = '*/30 * * * * *'
var task = cron.schedule(everyDay, function() {
  cronJonFuncation()
}, true);

// Firebase Database :
var firebase = require('firebase');
var stripe = require("stripe")("sk_test_w8tSbojtWALZ2nq8GvRcsoxb");
var helper = require('sendgrid').mail;

// Fire base Development Database configuration
/*
var config = {
  apiKey: "AIzaSyDuYKBrXUmY1oXQrdf-sorEhbvWoTw79rM",
  authDomain: "gymonkee-3cad2.firebaseapp.com",
  databaseURL: "https://gymonkee-3cad2.firebaseio.com",
  projectId: "gymonkee-3cad2",
  storageBucket: "gymonkee-3cad2.appspot.com",
  messagingSenderId: "1023271343111"
};
*/

// Fire base Production Database configuration
var config = {
  apiKey: "AIzaSyDA4hJI_eGiyBPmvfj3I3T-y3Grm7oB3Bg",
  authDomain: "gymonkee-8b57b.firebaseapp.com",
  databaseURL: "https://gymonkee-8b57b.firebaseio.com",
  projectId: "gymonkee-8b57b",
  storageBucket: "gymonkee-8b57b.appspot.com",
  messagingSenderId: "363912616541"
};

//table -> parking-eagle-5215a
// Init Firebase Table
firebase.initializeApp(config);

console.log("###1 initializeApp called...");
var database = firebase.database();

function cronJonFuncation() {
  console.log('Cron Job called ======>'+ Date());
  console.log(new Date().toDateString());
  // return;
  var orderRef = firebase.database().ref('PurchaseOrders').orderByChild('orderCompletedAt').equalTo(new Date().toDateString()); 
  console.log("orderRef : "+orderRef.toString());
  orderRef.once('value', function gotdata(data) {

      console.log("PurchaseOrders...");

      if (data.exists()) {
          var orders = data.val();
          var keys = Object.keys(orders);

          console.log("keys...");
          console.log(keys);

          for (var i = 0; i < keys.length; i++) {
              var k = keys[i];
              var dict = orders[k];
              dict.key = k;
              // console.log(dict);
              if (!orders[k].isOrderCompleted) {
                  console.log("@@@@@@@@@@ order not completed");
                  transferFundToAccount(dict);
              } else {
                  console.log("########## order completed");
              }
          }
      }
  }, function errdata(err) {
      console.log(err);
  });
}

function transferFundToAccount(details) {
  console.log("transferFundToAccount called...");
  console.log(details);
  
  stripe.accounts.listExternalAccounts(details.stripeConnectAccountId, {object: "bank_account"}, function(err, bank_accounts) {
      console.log("stripe.accounts.listExternalAccounts Error...");
      console.log(err);
      console.log("bank_accounts...");
      console.log(bank_accounts);
      if (err) {
          // req.flash('error', err.message);
          // res.redirect('back');
      } else {
          var data = bank_accounts.data;
          if (data.length > 0) {                  
              var amountFinal = parseInt(parseFloat(details.amount) * 100);
              var createDict = {
                  amount: amountFinal,
                  currency: data[0].currency,
                  destination: details.stripeConnectAccountId,
                  source_type : 'bank_account',
              }
            console.log("createDict...");
            console.log(createDict);
              stripe.transfers.create(createDict, function(error, transfer) {
                 if (error) {
                      // req.flash('error', error.message);
                      // res.redirect('back');
                  } else {
                      var purchaseDict = {
                          updatedAt : firebase.database.ServerValue.TIMESTAMP,
                          updatedBy : "CronJob",
                          isOrderCompleted : true,
                          transferId : transfer.id
                      };
                      console.log("purchaseDict...");
                      console.log(purchaseDict);

                      var ref = firebase.database().ref('PurchaseOrders/'+details.key);
                      console.log("ref : "+ref.toString())

                      ref.update(purchaseDict);

                        // Order Completed
                          // Sent Email to Manager
                          setTimeout(function(){
                            sentEmail(details.gymManagerEmail,'Your Order has been completed.','Hello '+details.gymManagerName+',<br/><p>Your Order has been completed.<br/><p>Transfer Id : '+transfer.id+'<br/><p>Gym Name : '+details.gymName+'<br/><p>Amount : $'+details.amount+'<br/><p>CreatedAt : '+details.orderCreatedAt+'<br/><p>CompletedAt : '+details.orderCompletedAt+'<br/><p>Agreement Terms : '+details.aggreementTerms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                        }, 2000); 
                        // Sent Email to Admin
                        setTimeout(function(){
                            sentEmail(details.adminEmail,'You have completed purchase order for '+details.gymManagerName,'Hello '+details.adminName+',<br/><p>You have completed purchase order for '+details.gymManagerName+'<br/><p>Transfer Id : '+transfer.id+'<br/><p>Gym Name : '+details.gymName+'<br/><p>Amount : $'+details.amount+'<br/><p>CreatedAt : '+details.orderCreatedAt+'<br/><p>CompletedAt : '+details.orderCompletedAt+'<br/><p>Agreement Terms : '+details.aggreementTerms+'</p><br/><br/><b>Your Gymonkee Team</b></p><br/></br/></p><br/>');
                        }, 2000); 
                  }                   
              });
          } else {
              req.flash('notify', "There is no Bank Information added");
              res.redirect('back');
          }
      }
  });
}

function sentEmail(to,mailSubject,mailContent) {
  var from_email = new helper.Email('noreply@gymonkee.com');
  var to_email = new helper.Email(to);
  var subject = mailSubject
  var content = new helper.Content('text/html',mailContent);
  var mail = new helper.Mail(from_email, subject, to_email, content);

  var sg = require('sendgrid')('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');
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

// function cronJonFuncation()
// {
//   console.log('Cron Job called ======>'+ Date());
// }
task.start();
//task.stop();
