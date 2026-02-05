Instructions for the development of our [Capacitor](https://capacitorjs.com/)-based iOS & Android apps

## Setup

For Android, this file should be added, see the HTTPS setup below:

`android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config>
    <trust-anchors>
      <!-- Trust user added CAs -->
      <certificates src="@raw/<the .pem filename added to this folder without extension>"/>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
</network-security-config>
```

## Basic commands

```
cap sync
cap open ios
```

## Switching Environments

**Android Build Types and iOS Xcode Schemes**

The iOS scheme "App" is connected to the target "App". Another scheme, _App Staging_ also exists.

Switching schemes or build types currently the main goal of switching the Firebase Messaging backend attached to it (staging or prod). To change the frontend target, see below.

Insert the following files:

**Android**

```bash
./android/app/google-services.json # staging service file, used in general debug builds
./android/app/src/staging/google-services.json # staging service file, used in staging builds
./android/app/src/release/google-services.json # production service file, used in release builds
```

To switch, use View -> Tool Windows -> Build Variants in Android Studio, and switch the `:app` module.

**iOS**

```bash
./ios/App/App/FirebaseProd/GoogleService-Info.plist # production service file, used by the scheme App
./ios/App/App/FirebaseStaging/GoogleService-Info.plist # staging service file, used by the scheme App Staging
```

For these files, use the right sidebar in Xcode to set the "target membership" to the "App" and "AppStaging" schemes (one each) respectively.

### Frontend targets

Use commands like:

We use [environment-specific configurations](https://capacitorjs.com/docs/guides/environment-specific-configurations#export-environment-specific-capacitor-configuration) to define several configurations, see [capacitor.config.ts](../capacitor.config.ts).

Before running an app build, they need to copied or synced.

```bash
NODE_ENV=devpush|prod|beta|(default=staging) cap copy|run|sync
```

This will override the active server url and/or.

See set CF IP

```
yarn dev push
```

```sh
NODE_ENV=devpush cap copy
```

## Connecting to a local development server with HTTPS

The WebView app should be accessed in a privileged web context, that means, using HTTP on localhost, or using HTTPS when connecting to a another server.

When developing locally, you often want that an emulator or physical test device connects to a dev machine's on the local network.

### Using public domains & certificates

For physical iDevices at least, I've found it easiest to use an external certificate for local development.

See [tools/set-cf-ip.sh](../tools/set-cf-ip.sh), which is a script that uses the Cloudflare API to 1) update the IP of a public DNS record to the current dev machine's local IP, 2) request an external ZeroSSL certificate for it.

**Android**

Android's webview doesn't trust ZeroSSL certificates by default. So, you need to add the ZeroSSL Root Cert to `android/app/src/main/res/raw/zerosslroot.pem`

### Using custom hosts & self-signed mkcert certificates

Our Vite setup uses [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert). You can use this in combination with a modified hosts file to load URLs like `https://wtmg.staging:5173` which point to the local development server.

**iOS**:

- Simulators are easy:
  - Cert trust: you can simply drag & drop the mkcert root certificate on the Simulator to trust it.
  - Hostname resolution: simulators share much of the host macOS networking stack. If the macOS host can resolve the host (using `/etc/private/hosts`), the Simulator can too.
- Physical devices: trickier
  - The mkcert root ceriticate has to be installed manually on the device.
  - You can't simply edit `/etc/private/hosts` You can influence DNS resolution on the local network's DNS server, if accessible, or maybe [use an app](https://apple.stackexchange.com/questions/17077/add-a-hosts-file-entry-without-jailbreaking)

**Android**

Certificates to be trusted need to be added explicitly to the project before building:

Add:

- `android/app/src/main/res/raw/rootca.pem`

## Icon/splash screen generation

See https://github.com/ionic-team/capacitor-assets, which is invoked for our purposes here [tools/generatemobileicons.sh](../tools/generatemobileicons.sh)

## Debugging mobile webviews

**Android**:

- Use a Chromium-based browser (Chrome/Chromium/Vivaldi/Helium/Brave)
- Go to `chrome://inspect` or the equivalent -> from here you can inspect

**iOS**: use Safari on macOS, enable Developer settings, go to the Develop menu -> from here you can inspect
