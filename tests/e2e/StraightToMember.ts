import type { BrowserContext, Page } from '@playwright/test';
import { pay } from './util';
import { GenericFlow } from './GenericFlow';

/**
 * Test a robot that immediately tries to become a member, before having an account.
 * Check that the continueUrls continue to work as expected.
 */
export class StraightToMemberTest extends GenericFlow {
  async robot({
    page: page,
    context,
    email
  }: {
    page: Page;
    context: BrowserContext;
    email: string;
  }) {
    // Go to the home page
    await page.goto(this.baseURL);
    // Go to the About membership page in the navbar
    if (this.isMobile) {
      // on mobile, the side navbar must first be opened
      await page.locator('#navigation').getByRole('button').click();
    }
    await page
      .getByRole('navigation')
      .getByRole('link', { name: this.l('become-member-button') })
      .click();
    await page.waitForURL('**/about-membership*');
    // Click on the button on top, which jumps to the section on the bottom
    await page
      .locator('#media')
      .getByRole('link', { name: this.l('become-member-button') })
      .click();
    // Allow Svelte to hydrate before attempting the rest, otherwise hydration unchecks the checkbox
    await page.waitForLoadState();
    // Try to become a member (should not work)
    await page.getByRole('button', { name: this.l('become-member-button'), exact: true }).click();
    // Check the box
    await page.getByRole('checkbox', { name: this.l('i-use-wtmg-only') }).check();
    // Become a member (try again)
    await page.getByRole('button', { name: this.l('become-member-button'), exact: true }).click();
    // Check that it redirects (it should also have a continueUrl)
    await page.waitForURL('**/sign-in*');
    // Fill in details
    await page.getByLabel(this.l('email-label')).click();
    await page.getByLabel(this.l('email-label')).fill(email);
    await page.getByLabel(this.l('password-label')).click();
    await page.getByLabel(this.l('password-label')).fill('12345678');
    // Switch to the /register page, fill in details
    await page.getByRole('link', { name: this.l('register') }).click();
    await page.getByLabel(this.l('first-name')).click();
    await page.getByLabel(this.l('first-name')).fill('Robot');
    await page.getByLabel(this.l('first-name')).press('Tab');
    await page.getByLabel(this.l('last-name'), { exact: true }).fill('RobotL');
    await page.getByLabel(this.l('country')).selectOption('FR');
    await page.getByLabel(this.l('cookie-policy')).check();
    await page.getByRole('button', { name: this.l('sign-up') }).click();

    // Check that the page auto-redirects to the payment page
    await page.waitForURL('**/become-member/payment/**');
    await pay({ page, context, type: this.type, firstName: 'Robot', isMobile: this.isMobile });
    // Check that you are redirected to the Thank You page
    await page.waitForURL('**/become-member/thank-you');
  }

  async test() {
    // Create a robot
    const robotContext = await this.browser.newContext();
    const wtmgPage1 = await robotContext.newPage();
    await this.robot({ page: wtmgPage1, context: robotContext, email: 'robot@slowby.travel' });
    await robotContext.close();
  }
}
