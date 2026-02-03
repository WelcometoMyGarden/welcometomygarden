import { expect, type BrowserContext, type Page } from '@playwright/test';
import { openEmail } from './util';
import { GenericFlow } from './GenericFlow';

const DEBUG_REDIRECTIONS = false;

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
export class GardenManageTest extends GenericFlow {
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
    await page.getByRole('link', { name: this.l('sign-in') }).click();
    // Switch to register, immediately
    await page.getByRole('link', { name: this.l('register') }).click();
    // Create an account
    await page.getByRole('textbox', { name: this.l('first-name') }).click();
    await page.getByRole('textbox', { name: this.l('first-name') }).fill('Robot');
    await page.getByRole('textbox', { name: this.l('first-name') }).press('Tab');
    await page.getByRole('textbox', { name: this.l('last-name'), exact: true }).fill('RobotL');
    await page.getByRole('textbox', { name: this.l('last-name'), exact: true }).press('Tab');
    await page.getByRole('textbox', { name: this.l('email-label') }).fill('robot@slowby.travel');
    await page.getByRole('textbox', { name: this.l('email-label') }).press('Tab');
    await page.getByRole('textbox', { name: this.l('password-label') }).fill('12345678');
    await page.getByRole('checkbox', { name: this.l('cookie-policy') }).click();
    await page.getByRole('button', { name: this.l('sign-up') }).click();

    // Wait for the redirect to /explore
    await page.waitForURL('**/explore');

    // Close the page
    await page.close();

    // In a new page, load /garden/manage
    page = await context.newPage();
    await page.goto(`${this.baseURL}/garden/manage`);
    // Wait for the redirect to /account, because we're not verified yet
    await page.waitForURL('**/account');
    // Check that the verification toast appears
    await expect(page.locator('body')).toContainText(this.l('verification-toast'));
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
    // Confirm creation
    await openedLinkPage.getByRole('button', { name: this.l('add-your-garden-page') }).click();

    // Wait for redirect to to the explore page
    await openedLinkPage.waitForURL('**/explore/**');
    // Check that the "Your Garden copy is visible"
    await expect(page.getByText(this.l('your-garden'), { exact: true })).toHaveCount(1);

    await page.close();
    page = await context.newPage();
    // Manually open a new page on /garden/add
    await page.goto(`${this.baseURL}/garden/add`);
    // Wait for redirect to to the /garden/manage page
    await page.waitForURL('**/garden/manage');

    //
    await page.getByRole('button', { name: this.l('adjust-pin-location') }).click();
    await page.getByRole('textbox', { name: this.l('street-label') }).click();
    await page.getByRole('textbox', { name: this.l('street-label') }).fill('Avenue Anatole France');
    await page.getByRole('textbox', { name: this.l('street-label') }).press('Tab');
    await page.getByRole('textbox', { name: this.l('house-number-label') }).fill('5');
    await page.getByRole('textbox', { name: this.l('house-number-label') }).press('Tab');
    await page.getByRole('textbox', { name: this.l('province') }).press('Tab');
    await page.getByRole('textbox', { name: this.l('zip') }).fill('75007');
    await page.getByRole('textbox', { name: this.l('zip') }).press('Tab');
    await page.getByRole('textbox', { name: this.l('city') }).fill('Paris');
    await page.getByRole('textbox', { name: this.l('city') }).press('Tab');
    await page.getByRole('button', { name: this.l('confirm-pin') }).click();
    await page.getByRole('textbox', { name: this.l('description') }).click();
    await page
      .getByRole('textbox', { name: this.l('description') })
      .fill('This is my new description, I hope you like it.');
    // Disable electricity
    await page
      .locator('div')
      .filter({ hasText: this.l('electricity') })
      .nth(3)
      .click();
    // Enable Bonfire
    await page.getByRole('checkbox', { name: this.l('bonfire') }).check();
    await page.getByRole('spinbutton', { name: this.l('capacity-label') }).click();
    await page.getByRole('spinbutton', { name: this.l('capacity-label') }).fill('1');
    await page.getByRole('button', { name: this.l('update-garden') }).click();

    // Wait for redirect to to the explore page
    await openedLinkPage.waitForURL(`**/explore/**`);
    // Check that the "Your Garden copy is visible"
    await expect(page.getByText(this.l('your-garden'), { exact: true })).toHaveCount(1);
    await expect(page.getByText('This is my new description, I')).toHaveCount(1);
    await expect(page.getByText(this.l('bonfire'))).toBeVisible();
    // Check that electricity is gone
    await expect(page.getByText(this.l('electricity'))).toHaveCount(0);
    // Check that the capacity has change
    await expect(page.getByText(this.l('space-for-tent'))).toHaveCount(1);
  }

  async test() {
    // Create a robot
    const robotContext = await this.browser.newContext();
    if (DEBUG_REDIRECTIONS) {
      await robotContext.on('page', async (page) => {
        page.on('framenavigated', (frame) => {
          console.log('Frame navigated to:', frame.url());
        });
      });
    }
    const wtmgPage = await robotContext.newPage();
    await this.robot({ page: wtmgPage, context: robotContext, email: 'robot@slowby.travel' });
    await robotContext.close();
  }
}
