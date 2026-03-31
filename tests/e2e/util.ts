import { type Page, type BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'jsonc-parser';
import dotenv from 'dotenv';
import path from 'path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auth, db } from './api/firebase';
import { USERS, USERS_PRIVATE } from '$lib/api/collections';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserPrivate, UserPublic } from '$lib/models/User';
const __dirname = dirname(fileURLToPath(import.meta.url));
// Read from ".env" file.
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

export const removeEndingSlash = (str: string) => {
  if (str.endsWith('/')) {
    return str.substring(0, str.length - 1);
  }
  return `${str}`;
};

// The server sends unlocalized (English) URLs,
// in most cases (not for the new messages)
export const unlocalize = (url: string) => {
  let Url;
  try {
    Url = new URL(url);
  } catch (_) {
    console.error('Not a valid link prefix', url);
    return '';
  }
  // Strip the language parameter, if one exists
  // (any 2-character leading segment is assumed to be one)
  Url.pathname = Url.pathname.replace(/^\/\w\w(?:[?#\/]|$)/i, '/');
  return Url.toString();
};

export async function openEmail({
  context,
  name,
  toEmail,
  linkPrefix,
  existingMailpitPage,
  platform = 'mailpit'
}: {
  context: BrowserContext;
  name: string;
  /**
   * The email this mail sent TO (the receiver) - needed to distinguish email in a unified inbox
   */
  toEmail: string;
  /**
   * The prefix of the link in the mail to open
   */
  linkPrefix: string;
  existingMailpitPage?: Page;
  platform?: 'mailpit' | 'gmail';
}) {
  let emailPage: Page;
  if (platform === 'mailpit') {
    // Open a new tab with Mailpit
    emailPage = existingMailpitPage ?? (await context.newPage());
    await emailPage.goto('http://127.0.0.1:8025/');
    // Open verification email
    // TODO this assumes the email is the first one in the inbox
    await emailPage
      .getByRole('link', { name: `${name} to ${toEmail}` })
      .first()
      .click();
  } else {
    throw new Error(
      "GMail test account emails are deprecated and unsupported, let's find another solution."
    );
  }

  // Find plain text activation link inside the email (it can do that!)
  // NOTE: this is local-dev dependent
  //
  const popupPromise = emailPage.waitForEvent('popup');
  // Open the link with the desired prefix
  // do not include the protocol, gmail rewrites https to http for example
  const link = await emailPage
    .locator(`[href*="${linkPrefix.replace(/https?:\/\//, '')}"]`)
    .first();
  await link.click();
  const openedLinkPage = await popupPromise;
  // Wait for the verification JS to start and finalize, by waiting for a redirect to another page
  await openedLinkPage.waitForURL((url) => !url.pathname.includes('/auth/action'));
  return { mailpitPage: emailPage, openedLinkPage };
}

// --- Localization helper for tests (synchronous) ---
const localeCache: Record<string, Record<string, string>> = {};
export function t(locale: string, key: string, vars?: Record<string, string>) {
  if (!localeCache[locale]) {
    const localePath = resolve(__dirname, 'locales', `${locale}.jsonc`);
    const raw = readFileSync(localePath, 'utf8');
    // use jsonc-parser to be robust to comments
    const parsed = parse(raw) as Record<string, string> | undefined;
    localeCache[locale] = parsed || {};
  }
  const val = localeCache[locale][key];
  if (!val) {
    console.warn(`No value in ${locale} for ${key}`);
    return key;
  }
  if (!vars) return val;
  return Object.keys(vars).reduce((s, k) => s.replace(new RegExp(`{${k}}`, 'g'), vars[k]), val);
}

/**
 * @param param0
 */
export async function createFakePaymentData({ email }: { email: string }) {
  const authUser = await auth.getUserByEmail(email);
  const nowS = Math.floor(new Date().getTime() / 1000);
  const uid = authUser.uid;
  await Promise.all([
    (db.collection(USERS_PRIVATE).doc(uid) as DocumentReference<UserPrivate, UserPrivate>).update({
      stripeCustomerId: `cus_bogus_${email}`,
      stripeSubscription: {
        status: 'active',
        latestInvoiceStatus: 'paid',
        id: `sub_bogus_${email}`,
        // If needed, a real price could be loaded from api/.env.local using the same method as in ./api/stripe.ts
        priceId: 'price_bogus',
        startDate: nowS,
        currentPeriodStart: nowS,
        currentPeriodEnd: nowS + 365 * 24 * 3600,
        collectionMethod: 'charge_automatically'
      }
    }),
    (db.collection(USERS).doc(uid) as DocumentReference<UserPublic, UserPublic>).update({
      superfan: true
    })
  ]);
}

export async function payOnStripeWithBancontactRedirect({
  page,
  l
}: {
  /**
   * WTMG payment page
   */
  page: Page;
  l: (key: string) => string;
}) {
  // Fill in the Stripe payment details
  await page
    // Note: don't try to select for iframe[src^="https://js.stripe.com"], Stripe injects many
    // different iframes with the same start
    .locator('iframe[src^="https://js.stripe.com/v3/elements-inner-accessory-target"]')
    .contentFrame()
    // .getByPlaceholder(l('first-and-last')) // it seems Stripe changed this?
    // .getByRole('textbox', { name: l('first-and-last') }) // it seems they changd it again
    .getByRole('button', { name: 'Bancontact' })
    // .fill('Test ga'); // note: this should be properly prefilled now
    .click();

  await page.getByRole('button', { name: l('pay-now') }).click();

  await page.getByRole('link', { name: 'Authorize Test Payment' }).click();
}

export async function pretendToHavePaidWithRedirect({ page }: { page: Page }) {
  // last *: this will include a continueUrl in this case for chatting with

  await page.waitForURL('**/become-member/payment/**');
  // TODO: this page will still call the Stripe test mode API with the current user's parameters
  // We could:
  // 1. Intercept this call using Playwright browser tools http://localhost:5001/demo-test/europe-west1/createOrRetrieveUnpaidSubscriptionV2
  //  and return a sample response with the correct type, but old/bogus values. This will probably crash/error the Stripe client iframe, but that's fine
  // 2. We can inject better mock data (put local dev env Firebase vars into .env.test.local, and use the admin API here as an alternative to the "make superfan" emulator workaround ?)

  // Test hack: pretend like the payment worked fine
  const url = new URL(page.url());
  const succeededPaymentURL = `http://${url.host}${url.pathname}?${new URLSearchParams({
    // preserve the continueUrl or other url params if they exist
    ...Object.fromEntries(url.searchParams.entries()),
    // this intent is used to check whether the redirect status should be parsed
    payment_intent: 'bogus_intent',
    redirect_status: 'succeeded'
  })}${url.hash}`;
  // Load the page as if the payment succeeded
  await page.goto(succeededPaymentURL);
}

export async function pay({
  page,
  useStripe,
  email,
  l
}: {
  context: BrowserContext;
  page: Page;
  useStripe: boolean;
  email: string;
  isMobile: boolean;
  l: (key: string) => string;
}) {
  if (!useStripe) {
    await createFakePaymentData({ email });
    // Note: with the current code, the page should react
    // to the user becoming a member. So the redirect is not required any longer.
    //
    // await pretendToHavePaidWithRedirect({ page });
    await page.bringToFront();
  } else {
    await payOnStripeWithBancontactRedirect({ page, l });
  }
}

export async function deleteAccount({
  page,
  firstName,
  l
}: {
  page: Page;
  firstName: string;
  l: (key: string) => string;
}) {
  await page.bringToFront();
  await page.getByRole('button', { name: firstName }).click();
  await page.getByRole('link', { name: l('account') }).click();
  await page.getByRole('button', { name: l('delete-account') }).click();
  await page.getByPlaceholder(l('delete-placeholder')).fill(l('delete-everything'));
  await page
    .locator('#dialog')
    .getByRole('button', { name: l('delete-account') })
    .click();
  // confirm
  await page.getByRole('heading', { name: l('sign-in') }).locator('span');
}
