// @ts-check
// How to run:
//  firebase --project demo-test emulators:exec --ui --only auth,firestore ./runtests.sh
// This is an integration test that work with the Firestore emulator
const proxyquire = require('proxyquire');
const assert = require('node:assert');
const { describe, it, afterEach, beforeEach } = require('mocha');
const { DateTime } = require('luxon');
const sinon = require('sinon');
// const test = require('firebase-functions-test')({
//   projectId: 'demo-test'
// });
//
// beforeEach really runs before each test, also before nested tests

const { auth } = require('../seeders/app');
const { createNewUser } = require('../seeders/util');

const PROJECT_NAME = 'demo-test';

// eslint-disable-next-line no-unused-vars
const logger = (_) => () => {};
const loggerStub = { error: logger('error'), log: logger('log') };

async function clearAuth() {
  const deleteURL = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_NAME}/accounts`;
  return fetch(deleteURL, { method: 'DELETE' });
}

async function clearFirestore() {
  const deleteURL = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_NAME}/databases/(default)/documents`;
  return fetch(deleteURL, { method: 'DELETE' });
}

const threshold = DateTime.now()
  .startOf('hour')
  .minus({ days: 5 + 7 });

const testEmail = 'fredtest@email.com';
const testFirstName = 'Fred';
const testLang = 'nl';
const createUser = (subscriptionParams) =>
  createNewUser(
    { email: testEmail },
    {
      countryCode: 'BE',
      superfan: true,
      firstName: testFirstName,
      lastName: 'Test',
      communicationLanguage: testLang,
      stripeSubscription: {
        // should be something
        cancelAt: null,
        canceledAt: threshold.toSeconds(),
        renewalInvoiceLink: 'https://fake',
        status: 'canceled',
        latestInvoiceStatus: 'void',
        ...subscriptionParams
      }
    }
  );

describe('renewalScheduler', () => {
  let fakeEmail;
  let sendFeedback;

  beforeEach(() => {
    fakeEmail = sinon.fake();
    sendFeedback = proxyquire('../src/subscriptions/scheduled/sendFeedbackEmails.js', {
      // redirect auth to auth from the seeder utilities
      '../../firebase': { auth },
      '../../mail': {
        sendSubscriptionEndedFeedbackEmail: fakeEmail
      },
      'firebase-functions': { logger: loggerStub }
    });
  });

  afterEach(async () => {
    await clearAuth();
    await clearFirestore();
  });

  it('sends the feedback email when the account was created in the required window ', async () => {
    await createUser({
      currentPeriodStart: threshold.minus({ minutes: 10 }).toSeconds(),
      startDate: threshold.minus({ year: 1 }).toSeconds()
    });
    await sendFeedback();
    sinon.assert.calledOnceWithMatch(fakeEmail, testEmail, testFirstName, testLang);
  });

  it('does not send the feedback email when the account was created outside the required window ', async () => {
    const renewTime = threshold.minus({ hour: 1, minutes: 20 });
    await createUser({
      currentPeriodStart: renewTime.toSeconds(),
      startDate: renewTime.minus({ year: 1 }).toSeconds()
    });
    await sendFeedback();
    assert.strictEqual(fakeEmail.callCount, 0);
  });
});
