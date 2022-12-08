const functions = require('firebase-functions');
const stripe = require('stripe')(functions.config().stripe.secret_key);
module.exports = stripe;
