import { test as base } from '@playwright/test';
import { clearAuth, clearFirestore } from '../util';
import { type TestOptions } from '../../playwright.config';
import { MainFlowTest } from './MainFlow';
import { StraightToMemberTest } from './StraightToMember';

export const test = base.extend<TestOptions>({
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

test('main flow', async ({ browser, baseURL, type }) => {
  const flow = new MainFlowTest(browser, baseURL!, type);
  await flow.test();
});

test('straight to member', async ({ browser, baseURL, type }) => {
  const flow = new StraightToMemberTest(browser, baseURL!, type);
  await flow.test();
});

test.afterAll(async ({ browser }) => {
  await browser.close();
});
