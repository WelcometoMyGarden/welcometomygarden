import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { TestType } from '../../playwright.config';
import { openEmail } from './util';

/**
 * 1. Create an account without any shortcuts
 * 2. Go to /garden/manage, which should redirect to /account because the account is unverified yet
 * 3. Verify the account.
 * 4. Go back to /garden/manage manually, which should redirect to /garden/add
 * 5. Add a garden
 * 6. Go manually to /garden/add, which redirect to /garden/manage,
 *    and change the garden description, location, and facilities
 * 7. Expect auto-redirect to your garden, verify the changed description and facilities
 */
export class GardenManageTest {
  emailPlatform: 'mailpit' | 'gmail';

  constructor(
    private browser: Browser,
    private baseURL: string,
    private type: TestType = 'local'
  ) {
    this.emailPlatform = type === 'local' ? 'mailpit' : 'gmail';
  }

  async robot({
    page: inPage,
    context,
    email
  }: {
    page: Page;
    context: BrowserContext;
    email: string;
  }) {
    let page = inPage;
    await page.goto(this.baseURL);
    // Go to the /sign-in page, fill in details
    await page.getByRole('link', { name: 'Sign in' }).click();
    // Switch to register, immediately
    await page.getByRole('link', { name: 'Register' }).click();
    // Create an account
    await page.getByRole('textbox', { name: 'First Name' }).click();
    await page.getByRole('textbox', { name: 'First Name' }).fill('Robot');
    await page.getByRole('textbox', { name: 'First Name' }).press('Tab');
    await page.getByRole('textbox', { name: 'Last name' }).fill('RobotL');
    await page.getByRole('textbox', { name: 'Last name' }).press('Tab');
    await page.getByRole('textbox', { name: 'Email' }).fill('robot@slowby.travel');
    await page.getByRole('textbox', { name: 'Email' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill('12345678');
    await page.getByRole('checkbox', { name: 'I agree to the cookie policy' }).click();
    await page.getByRole('button', { name: 'Sign up' }).click();

    // Wait for the redirect to /explore
    await page.waitForURL('**/explore');

    // Close the page
    await page.close();

    // In a new page, load /garden/manage
    page = await context.newPage();
    await page.goto(`${this.baseURL}/garden/manage`);
    // Wait for the redirect to /account, because we're not verified yet
    await page.waitForURL('/account');
    // Check that the verification toast appears
    await expect(page.locator('body')).toContainText('Please verify your email first.');
    await page.close();

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

    await mailpitPage.close();

    page = openedLinkPage;

    await page.goto(`${this.baseURL}/garden/manage`);
    // Wait for the redirect to /garden/add, because we don't have a garden yet
    await page.waitForURL('**/garden/add');

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
    // Confirm creation
    await openedLinkPage.getByRole('button', { name: 'Add your garden' }).click();

    // Wait for redirect to to the explore page
    await openedLinkPage.waitForURL('**/explore/**');
    // Check that the "Your Garden copy is visible"
    await expect(page.getByText('Your Garden', { exact: true })).toHaveCount(1);

    await page.close();
    page = await context.newPage();
    // Manually open a new page on /garden/add
    await page.goto(`${this.baseURL}/garden/add`);
    // Wait for redirect to to the /garden/manage page
    await page.waitForURL('**/garden/manage');

    //
    await page.getByRole('button', { name: 'Adjust pin location' }).click();
    await page.getByRole('textbox', { name: 'Street' }).click();
    await page.getByRole('textbox', { name: 'Street' }).fill('Avenue Anatole France');
    await page.getByRole('textbox', { name: 'Street' }).press('Tab');
    await page.getByRole('textbox', { name: 'House number' }).fill('5');
    await page.getByRole('textbox', { name: 'House number' }).press('Tab');
    await page.getByRole('textbox', { name: 'Province or State' }).press('Tab');
    await page.getByRole('textbox', { name: 'Postal/ZIP Code' }).fill('75007');
    await page.getByRole('textbox', { name: 'Postal/ZIP Code' }).press('Tab');
    await page.getByRole('textbox', { name: 'City' }).fill('Paris');
    await page.getByRole('textbox', { name: 'City' }).press('Tab');
    await page.getByRole('button', { name: 'Confirm pin location' }).click();
    await page.getByRole('textbox', { name: 'Description' }).click();
    await page
      .getByRole('textbox', { name: 'Description' })
      .fill('This is my new description, I hope you like it.');
    // Disable electricity
    await page.locator('div').filter({ hasText: 'Electricity' }).nth(3).click();
    // Enable Bonfire
    await page.getByRole('checkbox', { name: 'Bonfire' }).check();
    await page.getByRole('spinbutton', { name: 'Capacity (required)' }).click();
    await page.getByRole('spinbutton', { name: 'Capacity (required)' }).fill('1');
    await page.getByRole('button', { name: 'Update your garden' }).click();

    // Wait for redirect to to the explore page
    await openedLinkPage.waitForURL(`**/explore/**`);
    // Check that the "Your Garden copy is visible"
    await expect(page.getByText('Your Garden', { exact: true })).toHaveCount(1);
    await expect(page.getByText('This is my new description, I')).toHaveCount(1);
    await expect(page.getByText('Bonfire')).toBeVisible();
    // Check that electricity is gone
    await expect(page.getByText('Electricity')).toHaveCount(0);
    // Check that the capacity has changed
    await expect(page.getByText('Space for 1 tent')).toHaveCount(1);
  }

  async test() {
    // Create a robot
    const robotContext = await this.browser.newContext();
    await robotContext.on('page', async (page) => {
      page.on('framenavigated', (frame) => {
        console.log('Frame navigated to:', frame.url());
      });
    });
    const wtmgPage = await robotContext.newPage();
    await this.robot({ page: wtmgPage, context: robotContext, email: 'robot@slowby.travel' });
    await robotContext.close();
  }
}
