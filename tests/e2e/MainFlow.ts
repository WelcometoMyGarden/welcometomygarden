import { type Browser, type BrowserContext, type Page, expect } from '@playwright/test';
import { deleteAccount, openEmail, pay } from './util';
import { type TestType } from '../../playwright.config';
import { GenericFlow } from './GenericFlow';

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
export class MainFlowTest extends GenericFlow {
  async robot1({ page, context, email }: { page: Page; context: BrowserContext; email: string }) {
    // Open the home page
    await page.goto(this.baseURL);

    // Click the "Add your garden" button in the top menu
    await page.getByRole('link', { name: this.l('add-your-garden') }).click();
    await page.waitForURL('**/sign-in*');
    await expect(page.url()).toContain('/sign-in');

    // Fill in sign-in details
    await page.getByLabel(this.l('email-label')).click();
    await page.getByLabel(this.l('email-label')).fill(email);
    await page.getByLabel(this.l('password-label')).click();
    await page.getByLabel(this.l('password-label')).fill('12345678');

    // Switch to the /register page, fill in details
    await page.getByRole('link', { name: this.l('register') }).click();
    await page.getByLabel(this.l('first-name')).click();
    await page.getByLabel(this.l('first-name')).fill('Robot1');
    await page.getByLabel(this.l('first-name')).press('Tab');
    await page.getByLabel(this.l('last-name'), { exact: true }).fill('Robot1L');
    await page.getByLabel(this.l('country')).selectOption('FR');
    await page.getByLabel(this.l('cookie-policy')).check();
    await page.getByRole('button', { name: this.l('sign-up') }).click();
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
    // NOTE: we can not move the marker with playwright
    await openedLinkPage.getByRole('link', { name: this.l('add-your-garden-account') }).click();

    // Fill address
    await openedLinkPage.getByLabel(this.l('street-label'), { exact: true }).click();
    await openedLinkPage
      .getByLabel(this.l('street-label'), { exact: true })
      .fill("Rue de l'Étuve - Stoofstraat");
    // This will change the field and activate the confirmation button
    await openedLinkPage.getByLabel(this.l('street-label'), { exact: true }).press('Tab');
    await openedLinkPage.getByLabel(this.l('house-number-label'), { exact: true }).fill('46');
    await openedLinkPage.getByLabel(this.l('house-number-label'), { exact: true }).press('Tab');
    await openedLinkPage.getByRole('button', { name: this.l('confirm-pin') }).click();
    await openedLinkPage.getByPlaceholder(this.l('description-placeholder')).click();
    await openedLinkPage
      .getByPlaceholder(this.l('description-placeholder'))
      .fill(
        'I have a nice garden next to the touristic hotspot of Manneken Pis, feel free to come visit!'
      );

    await openedLinkPage.getByText(this.l('water'), { exact: true }).click();
    await openedLinkPage.getByText(this.l('shower')).click();
    await openedLinkPage.getByText(this.l('electricity')).click();
    await openedLinkPage.getByLabel(this.l('capacity-label')).click();
    await openedLinkPage.getByLabel(this.l('capacity-label')).fill('4');
    // Confirm
    await openedLinkPage.getByRole('button', { name: this.l('add-your-garden-page') }).click();
    // Wait for redirect to confirm addition
    // TODO: check for the copy "Your garden" to appear
    await openedLinkPage.waitForURL(`${this.baseURL}/explore/**`);
    // Close unnecessary tabs
    await Promise.all([openedLinkPage.close(), mailpitPage.close()]);
  }

  async robot2({ page, context, email }: { page: Page; context: BrowserContext; email: string }) {
    await page.goto(this.baseURL);
    // Go to the map
    await page
      .getByRole('navigation')
      .getByRole('link', { name: this.l('map-link-text') })
      .click();
    // Search for & click the existing added garden
    await page.getByPlaceholder(this.l('search-city-placeholder')).fill('brussel');
    await page.getByPlaceholder(this.l('search-city-placeholder')).press('Enter');
    await page.getByRole('button', { name: this.l('brussels-button'), exact: true }).click();

    // Probably assumes the default context: {viewport: { <size> }}
    // Wait for the zoom
    await page.waitForTimeout(5000);
    await page.getByRole('region', { name: 'Map' }).click({ position: { x: 635, y: 345 } });
    // This is maybe a bit flaky, and might select the top-right "connexion" in other languages
    // We want the inline sign in link in the garden card here
    await page.getByRole('link', { name: this.l('sign-in-lower'), exact: true }).click();
    // Switch to register, immediately
    await page.getByRole('link', { name: this.l('register') }).click();
    await page.getByLabel(this.l('first-name')).click();
    await page.getByLabel(this.l('first-name')).fill('Robot2');
    await page.getByLabel(this.l('first-name')).press('Tab');
    await page.getByLabel(this.l('last-name'), { exact: true }).fill('Robot2L');
    await page.getByLabel(this.l('email-label')).click();
    await page.getByLabel(this.l('email-label')).fill(email);
    await page.getByLabel(this.l('email-label')).press('Tab');
    await page.getByLabel(this.l('password-label')).fill('12345678');
    await page.getByLabel(this.l('cookie-policy')).check();
    await page.getByRole('button', { name: this.l('sign-up') }).click();
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
    await page.waitForURL('**/explore/garden/*');
    // The opened page should redirect to the garden we wanted to open
    // using the localStorage chatIntent measures
    await page.waitForURL('**/explore/garden/*');

    // Wait for the garden card to appear, click the become member link
    await page.getByRole('link', { name: this.l('become-member'), exact: true }).click();
    // Wait for the chat modal to load, click "I use WTMG only"...
    await page.getByRole('checkbox', { name: this.l('i-use-wtmg-only') }).check();
    // Go to the payment page
    await page.getByRole('button', { name: this.l('become-member-button') }).click();

    await pay({ page: page, context, type: this.type, firstName: 'Robot2' });

    // Wait until the original chat loads
    await page.waitForURL('**/chat/**');
    // Type a message
    await page.getByPlaceholder(this.l('type-message-placeholder')).click();
    await page
      .getByPlaceholder(this.l('type-message-placeholder'))
      .fill('Hello, what a nice garden you have! Can I stay?');
    await page.getByLabel(this.l('send-message-label')).click();

    return { mailpitPage };
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
    await wtmgPage1.getByRole('link', { name: this.l('chat') }).click();
    await wtmgPage1.getByRole('button', { name: 'R Robot2 Hello, what a nice' }).click();

    // Respond
    await wtmgPage1.getByPlaceholder(this.l('type-message-placeholder')).click();
    await wtmgPage1.getByPlaceholder(this.l('type-message-placeholder')).fill('Yes, sure!');
    await wtmgPage1.getByLabel(this.l('send-message-label')).click();

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
      await deleteAccount({ page: wtmgPage1, firstName: 'Robot1', l: this.l.bind(this) });
      await deleteAccount({ page: robot2ChatPage, firstName: 'Robot2', l: this.l.bind(this) });
    }

    await Promise.all([robot1Context.close(), robot2Context.close()]);
  }
}
