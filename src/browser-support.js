/*
  This script has two responsibilities:
  1. it should show a clear warning to website visitors whose browser is not compatible with WTMG.
  2. it can try to apply some modifications to the DOM to make static pages more presentable, or degrade
     more cleanly on (mostly recent) unsupported browsers.

  It is minified by tools/minify-feature-detect.js to ./browser-support.min.js, which is comitted to version control,
  since it is not large nor expected to change often.
  The minified script is loaded by Vite in ./hooks.server.ts, and injected at the top of the <head>
  of all (static) page templates via app.html

  The JS here should be highly compatible, because the point is to warn users with incompatible browsers.
  Due to the DOMContentLoaded JS event below, IE6-7 will probably not be supported by this warning.
*/
(function () {
  var isUnsupportedBrowser = false;

  // ES module support, and dynamic import support, is required
  // Chrome >= 63
  // https://caniuse.com/?search=htmlscriptelement this feature check even works in IE6+
  function supportsESModules() {
    if (!('HTMLScriptElement' in window)) {
      return false;
    }
    if ('supports' in HTMLScriptElement) {
      return HTMLScriptElement.supports('module');
    }
    return 'noModule' in document.createElement('script');
  }

  // Module worker support (new Worker(url, { type: 'module' })) is required: the map
  // (mapbox-gl v3) loads its Web Worker this way. Detected with the "type getter" trick —
  // only browsers that support module workers read the `type` option while constructing
  // the Worker, which flips the flag. Roughly Chrome >= 80, Safari >= 15, Firefox >= 114.
  function supportsModuleWorker() {
    if (
      !('Worker' in window) ||
      !('Blob' in window) ||
      !('URL' in window) ||
      !URL.createObjectURL
    ) {
      return false;
    }
    // The "type getter" probe relies on ES5 object-literal getter syntax
    // (`{ get type() {} }`), which IE8 and older cannot PARSE — and a parse error
    // anywhere in this file aborts the whole script, so those browsers would never even
    // reach the unsupported-browser banner (which we still target — see the IE8 note
    // below). Keeping the probe inside a `new Function` string means only engines that
    // evaluate it ever parse the getter, the same technique as the ?? / ??= check below;
    // it also keeps the getter out of TypeScript's view (no type cast/suppression needed).
    // The built function returns whether the `type` getter fired, i.e. whether the engine
    // read the module-worker option while constructing the Worker.
    try {
      var readModuleType = new Function(
        'var r = false;' +
          'var u = URL.createObjectURL(new Blob([""], { type: "text/javascript" }));' +
          'try { new Worker(u, { get type() { r = true; return "module"; } }).terminate(); } catch (e) {}' +
          'if (URL.revokeObjectURL) { URL.revokeObjectURL(u); }' +
          'return r;'
      );
      return !!readModuleType();
    } catch (e) {
      return false;
    }
  }

  if (
    !supportsESModules() ||
    !('Proxy' in window) ||
    // ResizeObserver is Chrome >= 64
    !('ResizeObserver' in window) ||
    // Module workers are required by the map (mapbox-gl); Chrome >= 80, Safari >= 15, Firefox >= 114
    !supportsModuleWorker()
  ) {
    isUnsupportedBrowser = true;
  }

  // eval-like check in case the browser wasn't ruled out yet
  //
  // We are targetting ES2021 support, so both ?? (ES2020) and ??= (ES2021) should work
  // See https://esbuild.github.io/content-types/#javascript
  // TODO: are there alternatives to eval?
  //
  // This is >=Chrome 85+ and Safari 14.5+
  if (!isUnsupportedBrowser) {
    try {
      new Function('true ?? "OK"');
      new Function('var a = {"b": null}; a.b ??= 1');
    } catch (e) {
      isUnsupportedBrowser = true;
    }
  }

  /** @type {HTMLDivElement | undefined} */
  var banner;

  function showBanner() {
    // Detect language from path
    var pathname = window.location.pathname;
    var language = 'en'; // default

    if (pathname.indexOf('/nl/') === 0 || pathname === '/nl') {
      language = 'nl';
    } else if (pathname.indexOf('/fr/') === 0 || pathname === '/fr') {
      language = 'fr';
    }

    // Create banner with language-specific message
    /** @type {{ [key: string]: string }} */
    var messages = {
      en:
        '<p>This browser is no longer supported by WTMG. Try another browser or another device.</p>' +
        '<p>If you need help, contact support@welcometomygarden.org.</p>',
      nl:
        '<p>Deze browser wordt niet langer ondersteund door WTMG. Probeer een andere browser of een ander toestel.</p>' +
        '<p>Als je hulp nodig hebt, contacteer ons op support@welcometomygarden.org.</p>',
      fr:
        "<p>Ce navigateur n'est plus pris en charge par WTMG. Essayez un autre navigateur ou un autre appareil.</p>" +
        "<p>Si vous avez besoin d'aide, contactez-nous via support@welcometomygarden.org.</p>"
    };

    banner = document.createElement('div');
    banner.id = 'unsupported-browser-banner';

    banner.innerHTML = messages[language] || messages['en'];
    // Insert banner at the top of the page
    if (document.body) {
      document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.style.backgroundColor = '#ffeeab';
    banner.style.color = 'black';
    banner.style.padding = '16px 18px';
    banner.style.textAlign = 'center';
    banner.style.fontFamily = 'Arial, sans-serif';
    banner.style.fontSize = '18px';
    banner.style.zIndex = '9999';
    banner.style.position = 'relative';
    banner.style.width = '100%';
    banner.style.boxSizing = 'border-box';
  }

  // https://caniuse.com/usage-table we target IE8, which now has 0.02% usage
  if (isUnsupportedBrowser) {
    showBanner();
    console.warn('This browser is not supported');
  } else {
    console.debug('This browser is supported');
  }

  // ------- after the warning is shown here, we can add less compatible code -----

  if (isUnsupportedBrowser) {
    // Make the dvh CSS hack in src/routes/+layout.svelte work on
    // Chrome 85 and below, which can't run our normal Svelte JS
    var wtmgAppEl = document.getElementById('wtmg-app');
    if (wtmgAppEl) {
      var _1vh = window.innerHeight * 0.01 + 'px';
      wtmgAppEl.style.setProperty('--vh', _1vh);
    }

    // Push the desktop WTMG nav under the banner, if possible
    var bannerHeight;
    if (banner) {
      bannerHeight = banner.clientHeight;
    } else {
      bannerHeight = 0;
    }
    var topNav = document.getElementById('top-nav');
    if (topNav) {
      topNav.style.top = bannerHeight + 'px';
    }
  }
})();
