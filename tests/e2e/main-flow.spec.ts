import { test, type BrowserContext, type Page } from '@playwright/test';
import { clearAuth, clearFirestore } from '../util';

test.afterEach(async () => {
  await Promise.all([clearFirestore(), clearAuth()]);
});

const robot1 = async ({ page, context }: { page: Page; context: BrowserContext }) => {
  await page.goto('http://localhost:5173/');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await page.getByLabel('Email').click();
  await page.getByLabel('Email').fill('test+robot1@slowby.travel');
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

  // Open a new tab with Mailpit
  const mailpit = await context.newPage();
  await mailpit.goto('http://127.0.0.1:8025/');
  // Open verification email
  // TODO this assumes the email is the first one in the inbox
  await mailpit
    .getByRole('link', { name: 'accountVerificationEmail to test+robot1@slowby.travel' })
    .first()
    .click();
  const verifiedPagePromise = mailpit.waitForEvent('popup');
  // Find plain text activation link inside the email (it can do that!)
  // NOTE: this is local-dev dependent
  await mailpit.getByRole('link', { name: 'http://localhost:5173/auth/' }).click();
  const verifiedPage = await verifiedPagePromise;
  // Add garden
  await verifiedPage.getByRole('link', { name: 'Add your garden' }).click();
  // NOTE: we can not move the marker with playwright
  // await page2.locator('.marker').click();
  // Fill address
  await verifiedPage.getByLabel('Street', { exact: true }).click();
  await verifiedPage.getByLabel('Street', { exact: true }).fill('Manneken Pis');
  // This will change the field and activate the confirmation button
  await verifiedPage.getByLabel('Street', { exact: true }).press('Tab');
  await verifiedPage.getByRole('button', { name: 'Confirm pin location' }).click();
  await verifiedPage.getByPlaceholder('Enter description...').click();
  await verifiedPage
    .getByPlaceholder('Enter description...')
    .fill(
      'I have a nice garden next to the touristic hotspot of Manneken Pis, feel free to come visit!'
    );
  await verifiedPage.getByText('Water', { exact: true }).click();
  await verifiedPage.getByText('Shower').click();
  await verifiedPage.getByText('Electricity').click();
  await verifiedPage.getByLabel('Capacity (required)').click();
  await verifiedPage.getByLabel('Capacity (required)').fill('4');
  // Confirm
  await verifiedPage.getByRole('button', { name: 'Add your garden' }).click();
  // Wait for redirect to confirm addition
  await verifiedPage.waitForURL('http://localhost:5173/explore/**');
  // Close unnecessary tabs
  await Promise.all([verifiedPage.close(), mailpit.close()]);
};

const robot2 = async ({ page: wtmgPage, context }: { page: Page; context: BrowserContext }) => {
  await wtmgPage.goto('http://localhost:5173/');
  await wtmgPage.getByRole('link', { name: 'Sign in' }).click();
  await wtmgPage.getByRole('link', { name: 'Register' }).click();
  await wtmgPage.getByLabel('First Name').click();
  await wtmgPage.getByLabel('First Name').fill('Robot2');
  await wtmgPage.getByLabel('First Name').press('Tab');
  await wtmgPage.getByLabel('Last name').fill('Robot2L');
  await wtmgPage.getByLabel('Email').click();
  await wtmgPage.getByLabel('Email').fill('test+robot2@slowby.travel');
  await wtmgPage.getByLabel('Email').press('Tab');
  await wtmgPage.getByLabel('Password').fill('12345678');
  await wtmgPage.getByLabel('I agree to the cookie policy').check();
  await wtmgPage.getByRole('button', { name: 'Sign up' }).click();

  // mailpit
  const mailpitPage = await context.newPage();
  await mailpitPage.goto('http://127.0.0.1:8025/');
  await mailpitPage
    .getByRole('link', {
      name: 'accountVerificationEmail to test+robot2@slowby.travel'
    })
    .first()
    .click();
  await mailpitPage.getByRole('link', { name: 'http://localhost:5173/auth/' }).click();

  // open firebase admin to make this one a superfan
  const firebaseAdminPage = await context.newPage();
  await firebaseAdminPage.goto('http://localhost:4001/');
  // Open "Authentication"
  await firebaseAdminPage.getByRole('link', { name: 'Go to auth emulator' }).click();
  // Locate the user ID of robot2
  await firebaseAdminPage
    .locator('tr')
    .filter({ hasText: 'Robot2' })
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
  const handle = await wtmgPage.evaluateHandle(() => navigator.clipboard.readText());
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

  // Get back to WTMG
  await wtmgPage.bringToFront();
  // TODO: for some reason we're getting token permission issues! Maybe a bug?
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
  await firebaseAdminPage.close();

  return { mailpitPage };
};

test('main flow', async ({ browser }) => {
  // Create robot 1 with a garden
  const robot1Context = await browser.newContext();
  const wtmgPage1 = await robot1Context.newPage();
  await robot1({ page: wtmgPage1, context: robot1Context });

  // Create robot 2 as a superfan traveller and send a message to robot 1
  const robot2Context = await browser.newContext();
  const wtmgPage2 = await robot2Context.newPage();
  const { mailpitPage: robot2Mailpit } = await robot2({ page: wtmgPage2, context: robot2Context });

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
  await robot2Mailpit
    .getByRole('link', {
      name: 'messageReceivedEmail to test+robot2@slowby.travel'
    })
    .first()
    .click();

  // await wtmgPage1.close();

  // Ignore popup this time
  // const page5Promise = page4.waitForEvent('popup');
  const chatPagePromise = robot2Mailpit.waitForEvent('popup');
  await robot2Mailpit.getByRole('link', { name: 'http://localhost:5173/chat/' }).click();
  const robot2ChatPage = await chatPagePromise;
  // Confirm that the response is visible
  await robot2ChatPage.getByText('Yes, sure!');
  await Promise.all([robot1Context.close(), robot2Context.close()]);
});

test.afterAll(async ({ browser }) => {
  browser.close();
});
