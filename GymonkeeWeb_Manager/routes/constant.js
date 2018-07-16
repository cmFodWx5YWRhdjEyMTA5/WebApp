
const managerUrl    =   '/';
const adminUrl      =   '/';

const fromHoursArray = ['5 AM','6 AM','7 AM','8 AM','9 AM','10 AM'];

const toHoursArray = ['5 PM','6 PM','7 PM','8 PM','9 PM','10 PM'];

const servicesArray = ['Juice bar','Cycle room','Pool','Yoga','Sauna','Basketball','Classes'];

const stateArray = ['Alabama','Alaska','Arizona','Arkansas','California',
    'Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia',
    'Hawaii','Idaho','Illinois','Indiana',
    'Iowa','Kansas','Kentucky','Louisiana',
    'Maine','Maryland','Massachusetts',
    'Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska'
    ,'Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina',
    'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
    'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']

const maxImageSize = 5; //5 MB

const UserType_SuperAdmin       = 'superAdmin';
const UserType_GymManager       = 'gymManager';
const UserType_AdminTeammate    = 'adminTeammate';

const DENIED    = 'permission_denied';

const CLOSED      = 'Closed';

const QUERY_LIMIT = 10;

const NET_TERMS_ARRAY = ['Immediate','NET 15','NET 30','NET 45','NET 60'];
/*
Admin - all functionality, only admin can edit gym coins

Teammate - Add gym (no delete), Edit Gym, Edit user coins, see check in history, Add/Delete User, View check ins vs coins used dashboard, view gyms registered per month dashboard
*/

module.exports = Object.freeze({
    // Production Config
    /*
     config : {
        apiKey: "AIzaSyDA4hJI_eGiyBPmvfj3I3T-y3Grm7oB3Bg",
        authDomain: "gymonkee-8b57b.firebaseapp.com",
        databaseURL: "https://gymonkee-8b57b.firebaseio.com",
        projectId: "gymonkee-8b57b",
        storageBucket: "gymonkee-8b57b.appspot.com",
        messagingSenderId: "363912616541"
    },
     file : './gymonkee-8b57b-firebase-adminsdk-jpyov-773f8e04af.json',
    placeHolderImgUrl : 'https://firebasestorage.googleapis.com/v0/b/gymonkee-3cad2.appspot.com/o/Resources%2Fplaceholder_img.png?alt=media',
    baseUrl : 'https://us-central1-gymonkee-8b57b.cloudfunctions.net/',
    secretKey : "sk_live_JmGIs37x03GszA484DztTfAT",
    secretKey_payout : "sk_live_JmGIs37x03GszA484DztTfAT",//"sk_live_MbAMJV377NHEuthGGBa6Le2S",
    */

    // Development Config
    // /*
    config : {
        apiKey: "AIzaSyDuYKBrXUmY1oXQrdf-sorEhbvWoTw79rM",
        authDomain: "gymonkee-3cad2.firebaseapp.com",
        databaseURL: "https://gymonkee-3cad2.firebaseio.com",
        projectId: "gymonkee-3cad2",
        storageBucket: "gymonkee-3cad2.appspot.com",
        messagingSenderId: "1023271343111"
    },
    file : './gymonkee-3cad2-firebase-adminsdk-k1kl5-ddda240a9e.json',
    placeHolderImgUrl : "https://firebasestorage.googleapis.com/v0/b/gymonkee-3cad2.appspot.com/o/Resources%2Fplaceholder_img.png?alt=media",
    baseUrl : 'https://us-central1-gymonkee-3cad2.cloudfunctions.net/',
    secretKey : "sk_test_w8tSbojtWALZ2nq8GvRcsoxb", //gymonkee
    secretKey_payout : "sk_test_w8tSbojtWALZ2nq8GvRcsoxb",//"sk_live_MbAMJV377NHEuthGGBa6Le2S",
    // secretKey : "sk_test_k4DvHjvlOZRj5xInhcbW7ZWu", //vishal sir
    // secretKey : "sk_test_s5qMndpEOFXXnGyqDtXOFxYw", //sujal sir
    // */
    SENDGRID_API_KEY : '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',
    fromArray : fromHoursArray,

    toArray : toHoursArray,

    servicesArray : servicesArray,

    stateArray : stateArray,

    maxImageSize : maxImageSize,

    UserType_SuperAdmin : UserType_SuperAdmin,

    UserType_GymManager : UserType_GymManager,

    UserType_AdminTeammate : UserType_AdminTeammate,

    managerUrl : managerUrl,

    adminUrl : adminUrl,

    DENIED : DENIED,

    CLOSED : CLOSED,

    QUERY_LIMIT : QUERY_LIMIT,
    
    NET_TERMS_ARRAY : NET_TERMS_ARRAY
});
