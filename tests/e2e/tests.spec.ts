import { test as base } from '@playwright/test';
import { clearAuth, clearFirestore } from '../util';
import { type TestOptions } from '../../playwright.config';
import { MainFlowTest } from './MainFlow';
import { StraightToMemberTest } from './StraightToMember';
import { GardenManageTest } from './GardenManage';

const test = base.extend<TestOptions>({
  type: ['local', { option: true }]
});

test.beforeEach(async ({ type }) => {
  // useful in case the test was manually stopped
  if (type === 'local') {
    await Promise.all([clearFirestore(), clearAuth()]);
  }
});

test.afterEach(async ({ type }) => {
  if (type === 'local') {
    await Promise.all([clearFirestore(), clearAuth()]);
  }
});

// Destructuring of the test arguments is mandatory in Playwright

test('main flow', async ({ browser, baseURL, type, locale }) => {
  const context = { browser, baseURL, type, locale };
  const flow = new MainFlowTest(context);
  await flow.test();
});

test('straight to member', async ({ browser, baseURL, type, locale }) => {
  const context = { browser, baseURL, type, locale };

  const flow = new StraightToMemberTest(context);
  await flow.test();
});

test('garden manage', async ({ browser, baseURL, type, locale }) => {
  const context = { browser, baseURL, type, locale };
  const flow = new GardenManageTest(context);
  await flow.test();
});

test.afterAll(async ({ browser }) => {
  await browser.close();
});
