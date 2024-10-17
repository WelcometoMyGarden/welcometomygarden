// This is an integration test that works with the Firestore emulator
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

// load process.env vars
const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });

const { auth } = require('../seeders/app');
const { createNewUser } = require('../seeders/util');
const mail = require('../src/mail');
const { loggerStub, clearAuth, clearFirestore } = require('./util');

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
        renewalInvoiceLink: 'https://fake',
        status: 'canceled',
        latestInvoiceStatus: 'void',
        ...subscriptionParams
      }
    }
  );

describe('feedback email', () => {
  let fakeEmail;
  let sendFeedback;

  const threshold = DateTime.now()
    .startOf('hour')
    .minus({ days: 5 + 7 });

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
      startDate: threshold.minus({ year: 1 }).toSeconds(),
      canceledAt: threshold.toSeconds()
    });
    await sendFeedback();
    sinon.assert.calledOnceWithMatch(fakeEmail, testEmail, testFirstName, testLang);
  });

  it('does not send the feedback email when the account was created outside the required window ', async () => {
    const renewTime = threshold.minus({ hour: 1, minutes: 20 });
    await createUser({
      currentPeriodStart: renewTime.toSeconds(),
      startDate: renewTime.minus({ year: 1 }).toSeconds(),
      canceledAt: threshold.toSeconds()
    });
    await sendFeedback();
    assert.strictEqual(fakeEmail.callCount, 0);
  });
});

describe('renewal reminder email', () => {
  let fakeEmail;
  let sendReminderEmail;

  const threshold = DateTime.now().startOf('hour').minus({ days: 5 });

  beforeEach(() => {
    fakeEmail = process.env.REAL_EMAIL
      ? // wrap the real method
        sinon.fake(mail.sendSubscriptionRenewalReminderEmail)
      : sinon.fake();
    sendReminderEmail = proxyquire('../src/subscriptions/scheduled/sendRenewalReminders.js', {
      // redirect auth to auth from the seeder utilities
      '../../firebase': { auth },
      '../../mail': {
        sendSubscriptionRenewalReminderEmail: fakeEmail
      }
    });
  });

  it('sends the right reminder email', async () => {
    // 36 eur price ID
    // TODO not sure if this will be loaded
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    const docProps = {
      countryCode: 'BE',
      superfan: true,
      firstName: testFirstName,
      lastName: 'Test',
      communicationLanguage: 'nl',
      stripeSubscription: {
        status: 'past_due',
        priceId,
        latestInvoiceStatus: 'open',
        cancelAt: null,
        renewalInvoiceLink: 'https://welcometomygarden.org/testsubscriptionlink',
        currentPeriodStart: threshold.toSeconds(),
        startDate: threshold.minus({ year: 1 }).toSeconds(),
        canceledAt: null
      }
    };

    const authProps = {
      email: 'thor+test1@slowby.travel',
      displayName: testFirstName
    };
    const authUser = await createNewUser(authProps, docProps);

    const docs = [
      {
        id: authUser.uid,
        data: () => ({ ...docProps })
      }
    ];
    await sendReminderEmail(docs);
    sinon.assert.calledOnceWithMatch(fakeEmail, {
      email: authProps.email,
      firstName: authProps.displayName,
      renewalLink: docProps.stripeSubscription.renewalInvoiceLink,
      language: docProps.communicationLanguage,
      price: 36
    });
  });
});
