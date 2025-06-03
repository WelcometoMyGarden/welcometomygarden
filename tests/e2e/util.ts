import { type Page, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getAccessToken, checkInbox, parseHtmlFromEmail, type Email } from 'gmail-getter';
import dotenv from 'dotenv';
import path from 'path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestType } from '../../playwright.config';
// import credentials from './credentials.json' assert { type: 'json' };
const __dirname = dirname(fileURLToPath(import.meta.url));
const credentials = JSON.parse(await readFile(resolve(__dirname, 'credentials.json'), 'utf8'));
// Read from ".env" file.
dotenv.config({ path: path.resolve(__dirname, '.env') });

let accessToken: string;

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
    if (!accessToken) {
      // Note: this is a slightly messy way of reusing an access token, won't work well if multiple accounts should be consulted
      const {
        installed: { client_id, client_secret }
      } = credentials;
      accessToken = await getAccessToken(
        client_id,
        client_secret,
        process.env.GMAIL_GETTER_REFRESH_TOKEN!
      );
    }

    // See Sendgrid for subjects
    const subjectMap = {
      messageReceivedEmail: 'has sent you a message!',
      accountVerificationEmail: 'Verify your email - Welcome To My Garden'
    };

    const email = await checkInbox({
      token: accessToken,
      all: false,
      // https://support.google.com/mail/answer/7190
      query: `to:${toEmail} subject:${subjectMap[name as keyof typeof subjectMap] || ''}`
    });

    // https://hackernoon.com/how-to-read-gmail-emails-with-playwright
    emailPage = await context.newPage();
    await emailPage.setContent(parseHtmlFromEmail(email as Email));
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

export async function makeSuperfan({
  context,
  firstName
}: {
  context: BrowserContext;
  firstName: string;
}) {
  // open firebase admin to make this one a superfan
  const firebaseAdminPage = await context.newPage();
  await firebaseAdminPage.goto('http://localhost:4001/');
  // Open "Authentication"
  await firebaseAdminPage.getByRole('link', { name: 'Go to auth emulator' }).click();
  // Locate the user ID of robot2
  await firebaseAdminPage
    .locator('tr')
    .filter({ hasText: firstName })
    .getByRole('cell')
    .nth(4)
    .click({
      // Select text
      clickCount: 3
    });

  // Copy user id
  await firebaseAdminPage.locator('body').press('ControlOrMeta+c');
  // Go to the Firestore view
  await firebaseAdminPage.getByRole('link', { name: 'Firestore' }).click();
  // Users
  await firebaseAdminPage.getByLabel('View contents of collection with id: "users"').click();
  // Focuses the path field (I tried other methods from codegen, but they don't work and probably rely on some JS hover somewhere)
  await firebaseAdminPage.getByText('homeusers').click();
  // Grant clipboard permissions to browser context
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const handle = await firebaseAdminPage.evaluateHandle(() => navigator.clipboard.readText());
  // For some reason the clipboard includes spaces
  const copiedUid = (await handle.jsonValue()).trim();
  await firebaseAdminPage.getByLabel('Document path').fill(`/users/${copiedUid}`);
  // open
  await firebaseAdminPage.getByLabel('Document path').press('Enter');
  // make superfan
  await firebaseAdminPage.getByRole('button', { name: 'add Add field' }).click();
  await firebaseAdminPage.getByLabel('Field', { exact: true }).fill('superfan');
  await firebaseAdminPage.getByLabel('Field', { exact: true }).press('Tab');
  await firebaseAdminPage.getByLabel('Type').selectOption('boolean');
  await firebaseAdminPage.getByLabel('Type').press('Tab');
  await firebaseAdminPage.getByRole('button', { name: 'Save' }).click();
  // Wait for the change to take effect
  await firebaseAdminPage.waitForTimeout(100);
}

export async function payOnStripeWithBancontactRedirect({
  page
}: {
  /**
   * WTMG payment page
   */
  page: Page;
}) {
  // Fill in the Stripe payment details
  await page
    .locator('iframe[src^="https://js.stripe.com/v3/elements-inner-payment"]')
    .contentFrame()
    .getByPlaceholder('First and last name')
    .fill('Test ga');
  await page.getByRole('button', { name: 'Pay now' }).click();
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
  context,
  type,
  firstName
}: {
  context: BrowserContext;
  page: Page;
  type: TestType;
  firstName: string;
}) {
  if (type === 'local') {
    await makeSuperfan({ context, firstName });
    await pretendToHavePaidWithRedirect({ page });
    await page.bringToFront();
  } else {
    await payOnStripeWithBancontactRedirect({ page });
  }
}

export async function deleteAccount({ page, firstName }: { page: Page; firstName: string }) {
  await page.bringToFront();
  await page.getByRole('button', { name: firstName }).click();
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Delete your account' }).click();
  await page.getByPlaceholder('d...').fill('delete everything');
  await page.locator('#dialog').getByRole('button', { name: 'Delete your account' }).click();
  // confirm
  await page.getByRole('heading', { name: 'Sign in' }).locator('span');
}
