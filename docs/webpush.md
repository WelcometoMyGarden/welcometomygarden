# Debugging web push

We're using Web Push for (mobile) notifications. Developing or debugging this comes with some gotchas, which I'll try to describe here.

## How it works

We are using Firebase Cloud Messaging (FCM) as an abstraction layer between us and Web Push subscriptions. It should allow us to scale our notification backend more easily to native Android/iOS later as well. On both the web frontend and backend, their SDK is available as the "messaging" API.

On the frontend, FCM takes over certain Service Worker event handlers related to Web Push.

## Setting up a dev env

Developing FCM Web Push isn't the most straightforward, since there is no local Firebase emulator for FCM, unlike other Firebase services (in Oct 2023).

Hence, you need to use a _real project's_ FCM instance; our staging instance, for example. Emulators can still be used for all other services (needed to experiment with new Functions code locally that sends notifications), but emulators themselves have limitations regarding testing on non-localhost devices (see later).

To set up a frontend with mixed emulators and staging FCM:

1. Make a `.env.devpush.local` env file. Make sure it has `VITE_USE_ALL_EMULATORS` set to `true`, and uses values for the staging environment otherwise.
2. Run `yarn dev:push`

To set up the backend, with our seeded database:

```
nvm use 16 && yarn run firebase:staging-push
```

## Gotchas

- Generally, **service workers** only allowed on HTTP on **localhost**. On other hosts, **HTTPS is required**.
- Firebase emulator limitations:
  1.  Firebase emulators do not support being served over HTTPS (all)
  2.  Firebase JS SDK emulator connectors do not support _connecting_ to HTTPS-based emulators (all except Auth)
- The first issue can be worked around with a HTTPS-enabled reverse-proxy. The second can't be worked around, without changing the SDK code (which I only briefly attempted).
- **Implications**:
  - it's easy to test web push on a **dev machine http localhost with emulators**, with a spoofed mobile phone User Agent (because we only allow notifications on mobile phones, by User Agent)
  - it's easy to test web push on mobile, using the real staging/production servers
  - it's _not_ easy to test with emulators on a real mobile device. The only way I got it to work: 1) to run a reverse nginx proxy in iSH on an iPhone, that connects to HTTP emulators on a desktop. This way, you can connect to localhost on the iPhone.
