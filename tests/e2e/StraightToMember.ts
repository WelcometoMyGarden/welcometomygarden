import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { TestType } from '../../playwright.config';
import { pay } from './util';

export class StraightToMemberTest {
  emailPlatform: 'mailpit' | 'gmail';
  constructor(
    private browser: Browser,
    private baseURL: string,
    private type: TestType = 'local'
  ) {
    this.emailPlatform = type === 'local' ? 'mailpit' : 'gmail';
  }

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
    // Go to the About membership page
    await page.getByRole('navigation').getByRole('link', { name: 'Become a Member' }).click();
    // Click on the button on top, which jumps to the section on the bottom
    await page.locator('#media').getByRole('link', { name: 'Become a Member' }).click();
    // Try to become a member (should not work)
    await page.getByRole('button', { name: 'Become a Member', exact: true }).click();
    // Check the box
    await page.getByText('I use WTMG only as a slow').click();
    // Become a member (try again)
    await page.getByRole('button', { name: 'Become a Member', exact: true }).click();
    // Check that it redirects (it should also have a continueUrl)
    await page.waitForURL('**/sign-in*');
    // Fill in details
    await page.getByLabel('Email').click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill('12345678');
    // Switch to the /register page, fill in details
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByLabel('First Name').click();
    await page.getByLabel('First Name').fill('Robot');
    await page.getByLabel('First Name').press('Tab');
    await page.getByLabel('Last name').fill('RobotL');
    await page.getByLabel('Country').selectOption('FR');
    await page.getByLabel('I agree to the cookie policy').check();
    await page.getByRole('button', { name: 'Sign up' }).click();

    // Check that the page auto-redirects to the payment page
    await page.waitForURL('**/become-member/payment/**');
    await pay({ page, context, type: this.type, firstName: 'Robot' });
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
