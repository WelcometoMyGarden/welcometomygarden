import { type Browser, type BrowserContext, type Page, expect } from '@playwright/test';
import {
  deleteAccount,
  makeSuperfan,
  openEmail,
  pay,
  payOnStripeWithBancontactRedirect,
  pretendToHavePaidWithRedirect
} from './util';
import { type TestType } from '../../playwright.config';

/**
 * A test flow that tests the main, including some detailed redirect handling.
 * 1. It creates a first user, robot 1, by clicking the "Add garden" button on the home page.
 *    a) It checks whether the email and password aretransferred from /sign-in to /register, and then
 *    whether the page automatically redirects to /account because the flow started with adding a garden.
 *    b) It adds a garden, and confirms the redirect to the map after the garden is added.
 * 2. It creates a second user, robot 2, by first searching for the first garden, clicking it, and clicking on "sign in"
 *    in the garden.
 *    a) It checks that both the original page and new tab from the email verification link (localStorage based) redirect back to the garden
 *    that the user wanted to contact, if the user was created by clicking a sign-in link from a garden.
 *    b) It clicks the "become a member" modal in garden opened through the verification email link, and goes through the payment flow (this is faked locally)
 *    c) It checks that the robot 2 is immediately redirected to the chat with robot 1 after paying.
 *    d) It performs a chat between the two robots, and exits if this works.
 */
export class MainFlowTest {
  emailPlatform: 'mailpit' | 'gmail';

  constructor(
    private browser: Browser,
    private baseURL: string,
    private type: TestType = 'local'
  ) {
    this.emailPlatform = type === 'local' ? 'mailpit' : 'gmail';
  }

  async robot1({ page, context, email }: { page: Page; context: BrowserContext; email: string }) {
    // Open the home page
    await page.goto(this.baseURL);

    // Click the "Add you garden" button
    await page.getByRole('link', { name: 'Add your garden' }).click();
    // Expects a redirect to the /sign-in page
    await page.waitForURL('**/sign-in*');
    await expect(page.url()).toContain('/sign-in');
    // Fill in sign-in details
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill('12345678');
    // Switch to the /register page, fill in details
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByLabel('First Name').click();
    await page.getByLabel('First Name').fill('Robot1');
    await page.getByLabel('First Name').press('Tab');
    await page.getByLabel('Last name').fill('Robot1L');
    await page.getByLabel('Country').selectOption('FR');
    await page.getByLabel('I agree to the cookie policy').check();
    await page.getByRole('button', { name: 'Sign up' }).click();
    // Expect to automatically get redirected to the /account page via the garden-adding continueUrl
    await page.waitForURL('**/account*');
    await expect(page.url()).toContain('/account');

    const { mailpitPage, openedLinkPage } = await openEmail({
      context,
      name: 'accountVerificationEmail',
      toEmail: email,
      linkPrefix: `${this.baseURL}/auth/`,
      platform: this.emailPlatform
    });

    // Wait for the successful verification & redirect to the /account page,
    await openedLinkPage.waitForURL('**/account*');
    // Then start adding a garden
    await openedLinkPage.getByRole('link', { name: 'Add your garden' }).click();
    // NOTE: we can not move the marker with playwright
    // await page2.locator('.marker').click();
    // Fill address
    await openedLinkPage.getByLabel('Street', { exact: true }).click();
    await openedLinkPage.getByLabel('Street', { exact: true }).fill("Rue de l'Étuve - Stoofstraat");
    // This will change the field and activate the confirmation button
    await openedLinkPage.getByLabel('Street', { exact: true }).press('Tab');
    await openedLinkPage.getByLabel('House number', { exact: true }).fill('46');
    await openedLinkPage.getByLabel('House number', { exact: true }).press('Tab');
    await openedLinkPage.getByRole('button', { name: 'Confirm pin location' }).click();
    await openedLinkPage.getByPlaceholder('Enter description...').click();
    await openedLinkPage
      .getByPlaceholder('Enter description...')
      .fill(
        'I have a nice garden next to the touristic hotspot of Manneken Pis, feel free to come visit!'
      );
    await openedLinkPage.getByText('Water', { exact: true }).click();
    await openedLinkPage.getByText('Shower').click();
    await openedLinkPage.getByText('Electricity').click();
    await openedLinkPage.getByLabel('Capacity (required)').click();
    await openedLinkPage.getByLabel('Capacity (required)').fill('4');
    // Confirm
    await openedLinkPage.getByRole('button', { name: 'Add your garden' }).click();
    // Wait for redirect to confirm addition
    // TODO: check for the copy "Your garden" to appear
    await openedLinkPage.waitForURL(`${this.baseURL}/explore/**`);
    // Close unnecessary tabs
    await Promise.all([openedLinkPage.close(), mailpitPage.close()]);
  }

  async robot2({
    page: inputPage,
    context,
    email
  }: {
    page: Page;
    context: BrowserContext;
    email: string;
  }) {
    let page = inputPage;
    await page.goto(this.baseURL);
    // Go to the map
    await page.getByRole('navigation').getByRole('link', { name: 'Map' }).click();
    // Search for & click the existing added garden
    await page.getByPlaceholder('Search for a city').fill('brussel');
    await page.getByPlaceholder('Search for a city').press('Enter');
    await page.getByRole('button', { name: 'Brussels, Brussels-Capital', exact: true }).click();
    // Probably assumes the default context: {viewport: { <size> }}
    // Wait for the zoom
    await page.waitForTimeout(5000);
    await page.getByRole('region', { name: 'Map' }).click({
      position: {
        x: 635,
        y: 345
      }
    });
    // Wait until the "sign-in" link becomes available on the garden card (todo: this may be a bit flaky, we could wait on the
    // name of the card appearing? and select in the card? The top-right link is "Sign in" with a captical letter)
    await page.getByRole('link', { name: 'sign in', exact: true }).click();
    // Switch to register, immediately
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByLabel('First Name').click();
    await page.getByLabel('First Name').fill('Robot2');
    await page.getByLabel('First Name').press('Tab');
    await page.getByLabel('Last name').fill('Robot2L');
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Email').press('Tab');
    await page.getByLabel('Password').fill('12345678');
    await page.getByLabel('I agree to the cookie policy').check();
    await page.getByRole('button', { name: 'Sign up' }).click();
    // Wait until the original page redirects back to the garden that we wanted to chat with
    // (using continueUrl)
    await page.waitForURL('**/explore/garden/*');

    // Verify
    // Note: without verifying, trying to open a chat
    // (or even "become a member" link when logged in)
    // Will redirect to /account with the question to verify
    const { mailpitPage, openedLinkPage } = await openEmail({
      context,
      name: 'accountVerificationEmail',
      toEmail: email,
      linkPrefix: `${this.baseURL}/auth/`,
      platform: this.emailPlatform
    });

    // Close the original page
    await page.close();

    // Continue with the opened verification link page
    page = openedLinkPage;
    await page.bringToFront();
    // The opened page should redirect to the garden we wanted to open
    // using the localStorage chatIntent measures
    await page.waitForURL('**/explore/garden/*');

    let firebaseAdminPage: Page | undefined = undefined;

    // Wait for the garden card to appear, click the become member link
    await page.getByRole('link', { name: 'become a member', exact: true }).click();
    // Wait for the chat modal to load, click "I use WTMG only"...
    await page.getByRole('checkbox', { name: 'I use WTMG only as a slow' }).check();
    // Go to the payment page
    await page.getByRole('button', { name: 'Become a Member' }).click();

    await pay({ page, context, type: this.type, firstName: 'Robot2' });

    // Wait until the original chat loads
    await page.waitForURL('**/chat/**');
    // Type a message
    await page.getByPlaceholder('Type your message...').click();
    await page
      .getByPlaceholder('Type your message...')
      .fill('Hello, what a nice garden you have! Can I stay?');
    await page.getByLabel('Send message').click();

    return { mailpitPage: mailpitPage };
  }

  async test() {
    let robot1Email = '';
    let robot2Email = '';
    if (this.type === 'local') {
      robot1Email = 'test+robot1@slowby.travel';
      robot2Email = 'test+robot2@slowby.travel';
    } else {
      const timestamp = new Date().toISOString().substring(2, 19).replace(/:/g, '-');
      robot1Email = `slowbytest+${timestamp}_1@gmail.com`;
      robot2Email = `slowbytest+${timestamp}_2@gmail.com`;
    }

    // Create robot 1 with a garden
    const robot1Context = await this.browser.newContext();
    const wtmgPage1 = await robot1Context.newPage();
    await this.robot1({ page: wtmgPage1, context: robot1Context, email: robot1Email });

    // Create robot 2 as a superfan traveller and send a message to robot 1
    const robot2Context = await this.browser.newContext();
    const wtmgPage2 = await robot2Context.newPage();

    const { mailpitPage: robot2Mailpit } = await this.robot2({
      page: wtmgPage2,
      context: robot2Context,
      email: robot2Email
    });

    // Open the chat as robot 1
    await wtmgPage1.getByRole('button', { name: 'R Robot1' }).click();
    await wtmgPage1.getByRole('link', { name: 'Chat' }).click();
    await wtmgPage1.getByRole('button', { name: 'R Robot2 Hello, what a nice' }).click();

    // Respond
    await wtmgPage1.getByPlaceholder('Type your message...').click();
    await wtmgPage1.getByPlaceholder('Type your message...').fill('Yes, sure!');
    await wtmgPage1.getByLabel('Send message').click();

    // Check for a response email as robot 2
    await robot2Mailpit.bringToFront();

    const { openedLinkPage: robot2ChatPage } = await openEmail({
      context: robot2Context,
      existingMailpitPage: robot2Mailpit,
      name: 'messageReceivedEmail',
      toEmail: robot2Email,
      linkPrefix: `${this.baseURL}/chat/`,
      platform: this.emailPlatform
    });

    // Confirm that the response is visible
    if (!robot2ChatPage) {
      throw new Error('No chat page opened for robot 2');
    }
    await robot2ChatPage.getByText('Yes, sure!');

    // Delete accounts so that the exact map spot that we need will not have two gardens
    if (this.type === 'staging') {
      await deleteAccount({ page: wtmgPage1, firstName: 'Robot1' });
      await deleteAccount({ page: robot2ChatPage, firstName: 'Robot2' });
    }

    await Promise.all([robot1Context.close(), robot2Context.close()]);
  }
}
