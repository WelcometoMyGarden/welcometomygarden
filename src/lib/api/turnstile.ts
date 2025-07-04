import type { AppCheckToken, CustomProviderOptions } from 'firebase/app-check';

const APIJS_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const turnstileDivId = 'turnstile-widget';
const turnstileClassName = 'cf-turnstile';

let promiseResolve: (value: unknown) => void;
export const readyTurnstile = new Promise((resolve) => {
  promiseResolve = resolve;
});

let token: AppCheckToken | null = null;
let tokenExpireTimeMillis = 0;

export class CloudflareProviderOptions implements CustomProviderOptions {
  constructor(
    private _tokenExchangeUrl: string,
    private _siteKey: string
  ) {
    // const body: HTMLElement = document.body;
    // const turnstileElement = this.makeDiv();
    // body.appendChild(turnstileElement);
    // body.appendChild(this.makeScript());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onloadTurnstileCallback = async (token) => {
      // console.debug('Rendering');
      // turnstile.render(turnstileElement, {
      //   sitekey: this._siteKey,
      //   callback: (token: string) => {
      console.debug(`turnstile callback`, token);
      promiseResolve(true);
      //   }
      // });
    };
  }

  private makeDiv() {
    const div = document.createElement('div');
    div.id = turnstileDivId;
    div.className = turnstileClassName;
    div.setAttribute('style', 'display: none;');
    // data-sitekey="yourSitekey" data-callback="javascriptCallback"
    div.dataset.sitekey = import.meta.env.VITE_FIREBASE_APP_CHECK_PUBLIC_KEY;
    div.dataset.callback = 'onloadTurnstileCallback';
    return div;
  }

  private makeScript() {
    const script = document.createElement('script');
    script.src = APIJS_URL;
    return script;
  }

  getSiteKey(): string {
    return this._siteKey;
  }

  async getToken(): Promise<{
    readonly token: string;
    readonly expireTimeMillis: number;
  }> {
    return this.renderAndExchange(true);
  }

  async getLimitedUseToken(): Promise<{
    readonly token: string;
    readonly expireTimeMillis: number;
  }> {
    return this.renderAndExchange(true);
  }

  private async renderAndExchange(limitedUse: boolean): Promise<Readonly<AppCheckToken>> {
    if (token !== null && tokenExpireTimeMillis > Date.now()) {
      return token;
    }

    await readyTurnstile;
    const turnstileToken = turnstile.getResponse('#' + turnstileDivId);
    // can't use callables, so we want to deploy an HTTP method.
    // https://github.com/firebase/firebase-js-sdk/issues/6176
    // const tokenExchange = httpsCallable(functions, "fetchAppCheckToken");

    // Sending limitedUseToken in the request for future limitedUseToken
    // specifiers in the admin sdk.
    const result = await fetch(this._tokenExchangeUrl, {
      method: 'POST',
      body: JSON.stringify({
        turnstileToken,
        limitedUse
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const appCheckToken: AppCheckToken = await result.json();
    if (appCheckToken.token === '') {
      throw new Error('Invalid Turnstile token');
    }

    token = appCheckToken;
    tokenExpireTimeMillis = Date.now() + 1000 * 60 * 60; // appCheckToken.expireTimeMillis;

    console.debug('Valid token, resetting');
    turnstile.reset(turnstileDivId);
    return appCheckToken;
  }
}
