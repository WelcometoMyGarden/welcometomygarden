import { test as base } from '@playwright/test';
import { clearAuth, clearFirestore } from '../util';
import { type TestOptions } from '../../playwright.config';
import { MainFlowTest } from './MainFlow';
import { StraightToMemberTest } from './StraightToMember';
import { GardenManageTest } from './GardenManage';

const test = base.extend<TestOptions>({
  useStripe: [false, { option: true }],
  useDemoProject: [true, { option: true }]
});

test.beforeEach(async ({ useDemoProject }) => {
  // useful in case the test was manually stopped
  if (useDemoProject) {
    await Promise.all([clearFirestore(), clearAuth()]);
  }
});

test.afterEach(async ({ useDemoProject }) => {
  if (useDemoProject) {
    await Promise.all([clearFirestore(), clearAuth()]);
  }
});

// Destructuring of the test arguments is mandatory in Playwright

test('main flow', async ({
  browser,
  baseURL,
  useStripe,
  useDemoProject,
  locale,
  isMobile
}, testInfo) => {
  const context = { browser, baseURL, useStripe, useDemoProject, locale, isMobile, testInfo };
  const flow = new MainFlowTest(context);
  await flow.test();
});

test('straight to member', async ({
  browser,
  baseURL,
  useStripe,
  useDemoProject,
  locale,
  isMobile
}) => {
  const context = { browser, baseURL, useStripe, useDemoProject, locale, isMobile };

  const flow = new StraightToMemberTest(context);
  await flow.test();
});

test('garden manage', async ({ browser, baseURL, useStripe, useDemoProject, locale, isMobile }) => {
  const context = { browser, baseURL, useStripe, useDemoProject, locale, isMobile };
  const flow = new GardenManageTest(context);
  await flow.test();
});

test.afterAll(async ({ browser }) => {
  await browser.close();
});
