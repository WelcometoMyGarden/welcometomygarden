# Developing push notifications

We are using Firebase Cloud Messaging (FCM) as an abstraction layer between us and push notification on web platforms, iOS and Android. Developing or debugging this comes with some gotchas, which I'll try to describe here.

## How it works

On Android & iOS, our [Capacitor app](./capacitor-mobile-apps.md) uses the Capacitor Firebase FCM integration to connect to FCM's native endpoints, and it bridges this as an API to the web frontend.

In "pure" or PWA web environments, FCM takes over certain Service Worker event handlers to enable Web Push notifications. This was our initial push notification system, before we launched the Capacitor app. It is currently still supported, but we want to phase out this method eventually in favor of the app since we were anyway already trying to constrain it to mobile user agents.

Developing for push notifications isn't the most straightforward, since there is no local Firebase emulator for FCM. This seems reasonable considering that remote services from browser vendors or device platforms (like Apple APNS) need to be contacted for production-like notification behavior.

## Setting up a dev environment for push notifications

To test push notifications, a _real project's_ FCM instance is needed; our staging instance, for example.

Firebase Emulators themselves have severe limitations regarding testing on non-localhost devices (see later), so in many cases you can't use them to develop/test push mobile notification code, with some exceptions.

To set up a frontend with mixed emulators and staging FCM use:

1. Make a `.env.devpush.local` env file in the root. Activate the emulators you want to use, if any, e.g. `VITE_USE_API_EMULATOR=true` (taking into account below emulator limitations).
2. Run `yarn dev:push`

Then refer to [package.json](../package.json) to see commands to run (some) staging emulators. Note that the `STAGING=true` variable prefix makes the seed script target the `wtmg-dev` project. If you don't have the Firebase or Auth emulators running, this will affect remote staging data.

## Web Push

### Testing web push the production backend with a local front-end

We can use the `.env.production.local` env file to connect to production services.

1. Android: in a Chromium-based browser, such as Vivaldi, using a mobile phone's user-agent.
2. iOS: in Safari, using an iPhone with iOS 16.4+ User Agent

See the gotchas below too: the easiest is to do this on a computer's **localhost**.

### Gotchas

**iOS Web Push support**: iOS only supports Web Push after 16.4, and support for it is not visible in standard browser tabs. Web apps first need to be added to the Home Screen. Our front-end is designed to detect these situations, and guide users to take the right steps (or at least it was, until our Capacitor app release!)

**HTTPS issues**

- Web Push relies on **Service Workers**. Generally, these are only allowed on HTTP on **localhost**. On other hosts, **HTTPS is required**.
- Firebase emulators have the following related limitations:
  1.  Firebase emulators do not support being served over HTTPS (applies to all)
  2.  Firebase JS SDK emulator connectors do not support _connecting_ to HTTPS-based emulators (all except Auth)
- The first issue could be worked around with a HTTPS-enabled reverse-proxy. The second can't be worked around, without changing the SDK code (which I only briefly attempted).

Implications:

- It's easy to test web push on mobile, using the real (HTTPS) staging/production servers **without emulators**
  - It's fairly easy to run a local frontend dev server via HTTPS, see our [Capacitor app development docs](./capacitor-mobile-apps.md) for setup instructions regarding compatibility with real or simulated devices.
- It's possible to test web push on a **dev machine using http localhost with Firebase Auth/Function/Storage emulators**, with a spoofed mobile phone User Agent (because we only allow notifications on mobile phones, by User Agent).
- An iOS simulator can also access the macOS `localhost` on http (but you will need to use Home Screen apps, see above). I'm not sure if Web Push can be tested with emulators this way.
- An Android Emulator can not access the macOS localhost, but its system browser supports Web Push on HTTPS endpoints (so no emulators)
- It's _not_ easy to test with emulators on a real mobile device. The only way I got it to work: 1) to run a reverse nginx proxy in iSH on an iPhone, that connects to HTTP emulators on a desktop. This way, you can connect to localhost on the iPhone. This approach is not practical.

**Debugging**

- As far as I can tell, it is not possible to inspect a Service Worker running on an connected iOS device through Safari's developer tools. It is only possible to inspect SW's on the Safari host computer.

**FCM Web Push Behavior**

- Firebase's front-end service worker code takes over all push notification handling (the first handler registered wins). To deliver push notifications, you must use their format with a `notification` object **and** ensure that the web app is not running in the foreground. Wrapping around our own handling logic is probably not possible without modifying or re-implementing the Firebase Messaging SDK.
- We noticed that FCM Web Push is not functioning well on Firefox on Android, especially when it comes to opening/tapping notifications. Therefore we try to steer people away from this situation with user agent detection.
