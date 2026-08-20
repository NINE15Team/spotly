/**
 * This file contains server side endpoints that can be used to perform backend
 * tasks that can not be handled in the browser.
 *
 * The endpoints should not clash with the application routes. Therefore, the
 * endpoints are prefixed in the main server where this file is used.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { deserialize } = require('./api-util/sdk');

const initiateLoginAs = require('./api/initiate-login-as');
const loginAs = require('./api/login-as');
const transactionLineItems = require('./api/transaction-line-items');
const initiatePrivileged = require('./api/initiate-privileged');
const transitionPrivileged = require('./api/transition-privileged');
const deleteAccount = require('./api/delete-account');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');

const router = express.Router();

const stripeWebhooks = require('./api/stripe-webhooks');
const activateSubscription = require('./api/activate-subscription');
const acceptSubscription = require('./api/accept-subscription');
const declineSubscription = require('./api/decline-subscription');
const cancelSubscription = require('./api/cancel-subscription');
const billingPortal = require('./api/billing-portal');
const operatorAbortSubscription = require('./api/operator-abort-subscription');

// Multi-participant waiver signing (PandaDoc)
const pandadocWebhook = require('./api/pandadoc-webhook');
const waiversConfig = require('./api/waivers-config');
const waiversPrimarySession = require('./api/waivers-primary-session');
const waiversSendSecondary = require('./api/waivers-send-secondary');
const waiversRefreshStatus = require('./api/waivers-refresh-status');
const participantsSwap = require('./api/participants-swap');

// ================ Raw-body webhooks (must be BEFORE the transit parser) ======= //

// Stripe webhooks require the raw request body for signature verification.
router.post('/stripe-webhooks', bodyParser.raw({ type: 'application/json' }), stripeWebhooks);

// PandaDoc webhook requires the raw request body for HMAC-SHA256 verification.
router.post('/webhooks/pandadoc', bodyParser.raw({ type: 'application/json' }), pandadocWebhook);

// ================ API router middleware: ================ //

// Parse Transit body first to a string
router.use(
  bodyParser.text({
    type: 'application/transit+json',
  })
);

// Deserialize Transit body string to JS data
router.use((req, res, next) => {
  if (req.get('Content-Type') === 'application/transit+json' && typeof req.body === 'string') {
    try {
      req.body = deserialize(req.body);
    } catch (e) {
      console.error('Failed to parse request body as Transit:');
      console.error(e);
      res.status(400).send('Invalid Transit in request body.');
      return;
    }
  }
  next();
});

// ================ API router endpoints: ================ //

router.get('/initiate-login-as', initiateLoginAs);
router.get('/login-as', loginAs);
router.post('/transaction-line-items', transactionLineItems);
router.post('/initiate-privileged', initiatePrivileged);
router.post('/transition-privileged', transitionPrivileged);
router.post('/delete-account', deleteAccount);
router.post('/activate-subscription', activateSubscription);
router.post('/accept-subscription', acceptSubscription);
router.post('/decline-subscription', declineSubscription);
router.post('/cancel-subscription', cancelSubscription);
router.post('/billing-portal', billingPortal);
router.post('/operator-abort-subscription', operatorAbortSubscription);

// Multi-participant waiver signing endpoints
router.get('/waivers/config', waiversConfig);
router.post('/waivers/primary-session', waiversPrimarySession);
router.post('/waivers/send-secondary', waiversSendSecondary);
router.post('/waivers/refresh-status', waiversRefreshStatus);
router.post('/participants/swap', participantsSwap);

// Create user with identity provider (e.g. Facebook or Google)
// This endpoint is called to create a new user after user has confirmed
// they want to continue with the data fetched from IdP (e.g. name and email)
router.post('/auth/create-user-with-idp', createUserWithIdp);

// Facebook authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Facebook
router.get('/auth/facebook', authenticateFacebook);

// This is the route for callback URL the user is redirected after authenticating
// with Facebook. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/facebook/callback', authenticateFacebookCallback);

// Google authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Google
router.get('/auth/google', authenticateGoogle);

// This is the route for callback URL the user is redirected after authenticating
// with Google. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/google/callback', authenticateGoogleCallback);

module.exports = router;
