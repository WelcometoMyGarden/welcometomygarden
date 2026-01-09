import type { Browser, TestInfo } from '@playwright/test';
import { t } from './util';

/**
 * Subset of Playwright the test context that we use
 */
export type TestContext = {
  browser: Browser;
  baseURL: string | undefined;
  useStripe: boolean;
  useDemoProject: boolean;
  locale: string | undefined;
  isMobile: boolean;
  testInfo: TestInfo;
};

const localizeUrl = (locale: string, url: string) => `${url}${locale === 'en' ? '' : `/${locale}`}`;

export class GenericFlow {
  protected browser: Browser;
  protected baseURL: string;
  protected useStripe: boolean;
  protected useDemoProject: boolean;
  protected emailPlatform: 'mailpit' | 'gmail';
  /**
   * String localizer
   */
  protected l: (key: string) => string;
  protected locale: string;
  protected isMobile: boolean;
  protected testInfo: TestInfo;

  constructor(args: TestContext) {
    this.browser = args.browser;
    this.baseURL = localizeUrl(args.locale!, args.baseURL!);
    this.useStripe = args.useStripe;
    this.useDemoProject = args.useDemoProject;
    this.locale = args.locale ?? 'en';
    this.l = (key: string) => (args.locale ? t(args.locale, key) : key);
    // this.emailPlatform = this.type === 'local' ? 'mailpit' : 'gmail';
    this.emailPlatform = 'mailpit';
    this.isMobile = args.isMobile;
    this.testInfo = args.testInfo;
  }
}
