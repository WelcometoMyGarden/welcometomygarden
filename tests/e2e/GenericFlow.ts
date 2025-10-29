import type { Browser } from '@playwright/test';
import type { TestType } from '../../playwright.config';
import { t } from './util';

/**
 * Subset of Playwright the test context that we use
 */
export type TestContext = {
  browser: Browser;
  baseURL: string | undefined;
  type: TestType;
  locale: string | undefined;
  isMobile: boolean;
};

const localizeUrl = (locale: string, url: string) => `${url}${locale === 'en' ? '' : `/${locale}`}`;

export class GenericFlow {
  protected browser: Browser;
  protected baseURL: string;
  protected type: TestType = 'local';
  protected emailPlatform: 'mailpit' | 'gmail';
  /**
   * String localizer
   */
  protected l: (key: string) => string;
  protected isMobile: boolean;

  constructor(args: TestContext) {
    this.browser = args.browser;
    this.baseURL = localizeUrl(args.locale!, args.baseURL!);
    this.type = args.type;
    this.l = (key: string) => (args.locale ? t(args.locale, key) : key);
    this.emailPlatform = this.type === 'local' ? 'mailpit' : 'gmail';
    this.isMobile = args.isMobile;
  }
}
