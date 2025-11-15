// This is a collection integration tests that works with the Firestore emulator.
//
// It mostly tests Firestore queries for scheduled emails, but also the manual filtering
// logic that does a second pass to avoid Firestore query limitations .
//
// The idea of these tests is to create expected Firestore state of a user
// account that started a subscription about a year ago.
// The Firestore queries should then return these (or not) depending on the exact timing and state,
// and emails should be sent to them (or not), which is tested by intercepting the email method imports
// with sinon. Stripe is not involved, it's effects are manually fixed as part of the test contex.
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

const { auth, db } = require('../seeders/app');
const { createNewUser } = require('../seeders/util');
const mail = require('../src/mail');
const { loggerStub, clearAuth, clearFirestore } = require('./util/util');

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

  beforeEach(async () => {
    fakeEmail = sinon.fake();
    ({ sendManualRenewalFeedbackEmails: sendFeedback } = proxyquire(
      '../src/subscriptions/scheduled/sendFeedbackEmails.js',
      {
        // redirect auth to auth from the seeder utilities
        '../../firebase': { auth },
        '../../mail': {
          sendSubscriptionEndedFeedbackEmail: fakeEmail
        },
        'firebase-functions': { logger: loggerStub }
      }
    ));
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
  let sendReminderEmail;

  beforeEach(async () => {
    await clearAuth();
    await clearFirestore();
  });

  it('sends the right reminder email (manual)', async () => {
    // Setup
    const fakeEmail = sinon.fake(mail.sendSubscriptionRenewalReminderEmail);
    const sendManualRenewalReminders = proxyquire(
      '../src/subscriptions/scheduled/sendManualRenewalReminders.js',
      {
        '../../mail': {
          sendSubscriptionRenewalReminderEmail: fakeEmail
        }
      }
    );

    const { handleRenewals } = proxyquire('../src/subscriptions/handleRenewals.js', {
      // Use reviously mocked
      './scheduled/sendManualRenewalReminders': sendManualRenewalReminders
    });

    const threshold = DateTime.now().startOf('hour').minus({ days: 5 });
    // 36 eur price ID
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    const docProps = {
      countryCode: 'BE',
      superfan: true,
      firstName: testFirstName,
      lastName: 'Test',
      communicationLanguage: 'nl',
      stripeSubscription: {
        id: 'bogus_id',
        status: /** @type {const} */ ('past_due'),
        priceId,
        latestInvoiceStatus: /** @type {const} */ ('open'),
        cancelAt: null,
        renewalInvoiceLink: 'https://welcometomygarden.org/testsubscriptionlink',
        currentPeriodStart: threshold.toSeconds(),
        currentPeriodEnd: threshold.plus({ year: 1 }).toSeconds(),
        startDate: threshold.minus({ year: 1 }).toSeconds(),
        canceledAt: null,
        collectionMethod: null
      }
    };

    const authProps = {
      email: 'thor+test1@slowby.travel',
      displayName: testFirstName
    };
    await createNewUser(authProps, docProps);

    await handleRenewals();
    sinon.assert.calledOnceWithMatch(fakeEmail, {
      email: authProps.email,
      firstName: authProps.displayName,
      renewalLink: docProps.stripeSubscription.renewalInvoiceLink,
      language: docProps.communicationLanguage,
      price: 36
    });
  });

  it('sends the right first reminder email (automatic)', async () => {
    // Setup
    // Wrap the 7 days before mail
    const fakeEmail = sinon.fake(mail.sendCancelledRenewalReminderEmail7DaysEmail);

    const portalLink = 'https://stripe-portal-link';
    const sendCancelledRenewalReminders = proxyquire(
      '../src/subscriptions/scheduled/sendCancelledRenewalReminders.js',
      {
        '../../mail': {
          sendCancelledRenewalReminderEmail7DaysEmail: fakeEmail
        },
        '../stripe': {
          billingPortal: {
            sessions: {
              create: () =>
                Promise.resolve({
                  url: portalLink
                })
            }
          }
        }
      }
    );

    const { handleRenewals } = proxyquire('../src/subscriptions/handleRenewals.js', {
      // User previously mocked
      './scheduled/sendCancelledRenewalReminders': sendCancelledRenewalReminders
    });

    const threshold = DateTime.now().startOf('hour').plus({ days: 7 });
    const substartSec = threshold.minus({ year: 1 }).toSeconds();
    // 36 eur price ID
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    const docProps = {
      countryCode: 'BE',
      superfan: true,
      firstName: testFirstName,
      lastName: 'Test',
      communicationLanguage: 'nl',
      stripeSubscription: {
        id: 'bogus_sub_id',
        status: /** @type {const} */ ('active'),
        priceId,
        latestInvoiceStatus: /** @type {const} */ ('paid'),
        cancelAt: threshold.toSeconds(),
        // Could be set to many arbitrary moments after the first sub until now
        canceledAt: threshold.minus({ months: 3 }).toSeconds(),
        // Not sure if the -1 is required
        currentPeriodStart: substartSec,
        currentPeriodEnd: threshold.toSeconds(),
        startDate: substartSec,
        collectionMethod: /** @type {const} */ ('charge_automatically'),
        renewalInvoiceLink: null
      }
    };

    const authProps = {
      email: 'thor+test1@slowby.travel',
      displayName: testFirstName
    };

    await createNewUser(authProps, docProps);

    await handleRenewals();

    sinon.assert.calledOnceWithMatch(fakeEmail, {
      email: authProps.email,
      firstName: authProps.displayName,
      portalLink,
      language: docProps.communicationLanguage,
      price: 36
    });
  });
});
