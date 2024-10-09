import { Browser, test as base, type BrowserContext, type Page } from '@playwright/test';
import { clearAuth, clearFirestore } from '../util';
import { deleteAccount, makeSuperfan, openEmail, payOnStripe } from './util';
import { defaultOptions, TestOptions, TestType } from '../../playwright.config';

export const test = base.extend<TestOptions>({
  // Define an option and provide a default value.
  // We can later override it in the config.
  options: [defaultOptions, { option: true }]
});

test.afterEach(async ({ options: { type } }) => {
  if (type === 'local') {
    await Promise.all([clearFirestore(), clearAuth()]);
  }
});

class MainFlowTest {
  emailPlatform: 'mailpit' | 'gmail';

  constructor(private browser: Browser, private baseURL: string, private type: TestType = 'local') {
    this.emailPlatform = type === 'local' ? 'mailpit' : 'gmail';
  }

  async robot1({ page, context, email }: { page: Page; context: BrowserContext; email: string }) {
    await page.goto(this.baseURL);
    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill('12345678');
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByLabel('First Name').click();
    await page.getByLabel('First Name').fill('Robot1');
    await page.getByLabel('First Name').press('Tab');
    await page.getByLabel('Last name').fill('Robot1L');
    await page.getByLabel('Country').selectOption('FR');
    await page.getByLabel('I agree to the cookie policy').check();
    await page.getByRole('button', { name: 'Sign up' }).click();
    // Go to the account page
    await page.getByRole('button', { name: 'R Robot1' }).click();
    await page.getByRole('link', { name: 'Account' }).click();

    const { mailpitPage, openedLinkPage } = await openEmail({
      context,
      name: 'accountVerificationEmail',
      toEmail: email,
      linkPrefix: `${this.baseURL}/auth/`,
      platform: this.emailPlatform
    });

    // Add garden
    await openedLinkPage.getByRole('link', { name: 'Add your garden' }).click();
    // NOTE: we can not move the marker with playwright
    // await page2.locator('.marker').click();
    // Fill address
    await openedLinkPage.getByLabel('Street', { exact: true }).click();
    await openedLinkPage.getByLabel('Street', { exact: true }).fill('Manneken Pis');
    // This will change the field and activate the confirmation button
    await openedLinkPage.getByLabel('Street', { exact: true }).press('Tab');
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
    await openedLinkPage.waitForURL(`${this.baseURL}/explore/**`);
    // Close unnecessary tabs
    await Promise.all([openedLinkPage.close(), mailpitPage.close()]);
  }

  async robot2({
    page: wtmgPage,
    context,
    email
  }: {
    page: Page;
    context: BrowserContext;
    email: string;
  }) {
    await wtmgPage.goto(this.baseURL);
    await wtmgPage.getByRole('link', { name: 'Sign in' }).click();
    await wtmgPage.getByRole('link', { name: 'Register' }).click();
    await wtmgPage.getByLabel('First Name').click();
    await wtmgPage.getByLabel('First Name').fill('Robot2');
    await wtmgPage.getByLabel('First Name').press('Tab');
    await wtmgPage.getByLabel('Last name').fill('Robot2L');
    await wtmgPage.getByLabel('Email').click();
    await wtmgPage.getByLabel('Email').fill(email);
    await wtmgPage.getByLabel('Email').press('Tab');
    await wtmgPage.getByLabel('Password').fill('12345678');
    await wtmgPage.getByLabel('I agree to the cookie policy').check();
    await wtmgPage.getByRole('button', { name: 'Sign up' }).click();

    // Verify
    const { mailpitPage } = await openEmail({
      context,
      name: 'accountVerificationEmail',
      toEmail: email,
      linkPrefix: `${this.baseURL}/auth/`,
      platform: this.emailPlatform
    });

    let firebaseAdminPage: Page | undefined = undefined;

    // Ensure superfan
    if (this.type === 'local') {
      ({ firebaseAdminPage } = await makeSuperfan({ context, firstName: 'Robot2' }));
    } else {
      // TODO: go through the flow to become a member
      await payOnStripe({ page: wtmgPage });
    }

    // Get back to WTMG
    await wtmgPage.bringToFront();
    // TODO: for some reason we're getting token permission issues! Maybe a bug?
    // NOTE: the reason is probably that we're not using the opened page after the verification email click, unlike robot1?
    // And verification is necessary?
    await wtmgPage.reload();

    await wtmgPage
      .getByRole('navigation')
      .getByRole('link', { name: 'Welcome To My Garden' })
      .click();
    await wtmgPage.locator('li').filter({ hasText: /^Map$/ }).click();
    await wtmgPage.getByPlaceholder('Search for a city').fill('brussel');
    await wtmgPage.getByPlaceholder('Search for a city').press('Enter');
    await wtmgPage.getByRole('button', { name: 'Brussels, Brussels-Capital', exact: true }).click();
    // Probably assumes the default context: {viewport: { <size> }}
    // Wait for the zoom
    await wtmgPage.waitForTimeout(5000);
    await wtmgPage.getByLabel('Map', { exact: true }).click({
      position: {
        x: 641,
        y: 327
      }
    });
    await wtmgPage.getByRole('link', { name: 'Contact host' }).click();
    await wtmgPage.getByPlaceholder('Type your message...').click();
    await wtmgPage
      .getByPlaceholder('Type your message...')
      .fill('Hello, what a nice garden you have! Can I stay?');
    await wtmgPage.getByLabel('Send message').click();
    //
    // Close firebase admin
    if (firebaseAdminPage) {
      await firebaseAdminPage.close();
    }

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

test('main flow', async ({ browser, options }) => {
  const flow = new MainFlowTest(browser, options.baseURL, options.type);
  await flow.test();
});

test.afterAll(async ({ browser }) => {
  browser.close();
});
