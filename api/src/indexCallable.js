const { HttpsError } = require('firebase-functions/v2/https');
const {
  requestPasswordReset,
  resendAccountVerification,
  requestEmailChange,
  propagateEmailChange
} = require('./auth');
const { createUser } = require('./user/createUser');
const {
  createOrRetrieveUnpaidSubscription
} = require('./subscriptions/createOrRetrieveUnpaidSubscription');
const { createCustomerPortalSession } = require('./subscriptions/createCustomerPortalSession');
const { discourseConnectLogin } = require('./discourse/discourseConnectLogin');
const { createStripeCustomer } = require('./subscriptions/createStripeCustomer');
const { manageEmailPreferences } = require('./sendgrid/manageEmailPreferences');
const { logger } = require('firebase-functions');

const handlers = {
  createCustomerPortalSession,
  createOrRetrieveUnpaidSubscription,
  createStripeCustomer,
  createUser,
  discourseConnectLogin,
  manageEmailPreferences,
  propagateEmailChange,
  requestEmailChange,
  requestPasswordReset,
  resendAccountVerification
};

/**
 * Bundles callable functions into one to keep 1 warm instance
 * and eliminate cold boots for these user flows.
 *
 * Called with { fn: '<handlerName>', data: <innerData> }.
 *
 * The client-side routing in src/lib/api/functions.ts is transparent to callers.
 *
 * @param {FV2.CallableRequest<{fn: keyof typeof handlers, data: unknown}>} request
 */
exports.indexCallable = async (request) => {
  const { fn, data: innerData } = request.data;

  if (typeof fn !== 'string' || !Object.hasOwn(handlers, fn)) {
    throw new HttpsError('invalid-argument', `Unknown function: ${fn}`);
  }

  const handler = /** @type {(request: FV2.CallableRequest) => any} */ (
    handlers[/** @type {keyof typeof handlers} */ (fn)]
  );

  logger.info(`Handling ${fn}`);

  return await handler({
    ...request,
    data: innerData
  });
};
