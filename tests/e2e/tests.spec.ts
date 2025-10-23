import { test as base } from '@playwright/test';
import { clearAuth, clearFirestore } from '../util';
import { t } from './util';
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

const localizeUrl = (locale: string, url: string) => `${url}${locale === 'en' ? '' : `/${locale}`}`;

test('main flow', async ({ browser, baseURL, type, locale }) => {
  const localize = (key: string) => (locale ? t(locale, key) : key);
  const flow = new MainFlowTest(browser, localizeUrl(locale!, baseURL!), type, localize);
  await flow.test();
});

test('straight to member', async ({ browser, baseURL, type, locale }) => {
  const localize = (key: string) => (locale ? t(locale, key) : key);
  const flow = new StraightToMemberTest(browser, localizeUrl(locale!, baseURL!), type, localize);
  await flow.test();
});

test('garden manage', async ({ browser, baseURL, type, locale }) => {
  const localize = (key: string) => (locale ? t(locale, key) : key);
  const flow = new GardenManageTest(browser, localizeUrl(locale!, baseURL!), type, localize);
  await flow.test();
});

test.afterAll(async ({ browser }) => {
  await browser.close();
});
