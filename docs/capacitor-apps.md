Instructions for the development of our [Capacitor](https://capacitorjs.com/)-based iOS & Android apps.

# Local development

## Switching Environments

**Android Build Types and iOS Xcode Schemes**

The iOS scheme "App" is connected to the target "App". Another scheme, _App Staging_ also exists. On Android, a "prod" and "staging" product flavor is defined to switch the Firebase environment, which are combineable with the built-in _debug_ and _release_ build types.

Switching schemes or build types currently has the main goal of switching the Firebase Messaging backend attached to it (staging or prod). To change the frontend target, see below.

Insert the following files:

**Android**

See the [Firebase documentation](https://firebase.google.com/docs/projects/multiprojects#support_multiple_environments_in_your_android_application)

```bash
./android/app/google-services.json # staging service file, used in general debug builds
./android/app/src/staging/google-services.json # staging service file, used in staging builds
./android/app/src/prod/google-services.json # production service file, used in release builds
```

To switch, use View -> Tool Windows -> Build Variants in Android Studio, and switch the `:app` module.

**iOS**

```bash
./ios/App/App/FirebaseProd/GoogleService-Info.plist # production service file, used by the scheme App
./ios/App/App/FirebaseStaging/GoogleService-Info.plist # staging service file, used by the scheme App Staging
```

For these files, use the right sidebar in Xcode to set the "target membership" to the "App" and "AppStaging" schemes (one each) respectively.

## Switching frontend targets

For now, the front-end uses the capacitor `server` config to directly load a target website in the webview when it opens.

Use commands like:

We use [environment-specific configurations](https://capacitorjs.com/docs/guides/environment-specific-configurations#export-environment-specific-capacitor-configuration) to define several target configurations, see [capacitor.config.ts](../capacitor.config.ts), which can be switches using a `cap` invocation with a specific `NODE_ENV`.

Before running an app build, they need to copied or synced.

```bash
NODE_ENV=devpush|devpushprod|prod|beta|(default=staging) cap copy|sync

# then run the app, can be done via the cli or Android Studio/Xcode GUI
cap run ios|android
```

This will override the active server url and/or App scheme.

It may still be necessary to select the appropriate staging or prod flavor/scheme in Android Studio or Xcode before building. For example, the production "App" scheme should be selected if you're targeting `https://beta.welcometomygarden.org`, otherwise the native app and encapsulated web app connect to a different Firebase project, leading to unintended behavior.

## Connecting to a local development server with HTTPS

The WebView app should be accessed in a privileged web context, that means, using HTTP on localhost, or using HTTPS when connecting to a another server.

When developing locally, you often want that an emulator or physical test device connects to a dev machine's on the local network.

### Prerequisite: Android certificate setup

For local HTTPS development on Android, this file should be added, since it is referenced in our Android manifests (and the app won't build otherwise).

You need to modify the file to reference the needed certificates, and include the certificate files as well. See below for more guidance.

`android/app/src/main/res/xml/network_security_config.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config>
    <trust-anchors>
      <!-- Trust the ZeroSSL root cert -->
      <certificates src="@raw/zerosslroot"/>
      <!-- Trust user added CAs -->
      <certificates src="@raw/<the .pem filename added to this folder without extension>"/>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
</network-security-config>
```

### Using public domains & certificates

For physical iDevices at least, I've found it easiest to use an external certificate for local development.

See [tools/set-cf-ip.sh](../tools/set-cf-ip.sh), which is a script that uses the Cloudflare API to 1) update the IP of a public DNS record to the current dev machine's local IP, 2) request an external ZeroSSL certificate for it, and store locally.

The certificate is referenced by `VITE_HTTPS_CERT_PATH` and `VITE_HTTPS_KEY_PATH` in .env files.

**Android setup**

Android's webview doesn't trust ZeroSSL certificates by default. So, you need to add the ZeroSSL Root Cert to `android/app/src/main/res/raw/zerosslroot.pem`

### Using custom hosts & self-signed mkcert certificates

Our Vite setup uses [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert). You can use this in combination with a modified hosts file to load URLs like `https://wtmg.staging:5173` which point to the local development server. Our capacitor config is currently not set up for this and would need to be modified to make it work.

**iOS setup**:

- Simulators are easy:
  - Cert trust: you can simply drag & drop the mkcert root certificate on the Simulator to trust it.
  - Hostname resolution: simulators share much of the host macOS networking stack. If the macOS host can resolve the host (using `/etc/private/hosts`), the Simulator can too.
- Physical devices: trickier
  - The mkcert root ceriticate has to be installed manually on the device.
  - You can't simply edit `/etc/private/hosts` You can influence DNS resolution on the local network's DNS server, if accessible, or maybe [use an app](https://apple.stackexchange.com/questions/17077/add-a-hosts-file-entry-without-jailbreaking)

**Android**

Certificates to be trusted need to be added explicitly to the project before building (see the setup file in the opening):

Add the file `android/app/src/main/res/raw/rootca.pem`

### Running the local development servers

Run front-end servers in Vite modes that reference the right TLS certificates.

```sh
# for staging
yarn dev:push
# or to connect to production
vite --mode devpushprod --host
```

Then build the app referencing the local hostname.

```sh
NODE_ENV=devpush cap copy
NODE_ENV=devpushprod cap copy
```

## Icon/splash screen generation

See https://github.com/ionic-team/capacitor-assets, which is invoked for our purposes here [tools/generatemobileicons.sh](../tools/generatemobileicons.sh)

## Debugging mobile webviews

**Android**:

- Use a Chromium-based browser (Chrome/Chromium/Vivaldi/Helium/Brave)
- Go to `chrome://inspect` or the equivalent -> from here you can inspect

**iOS**: use Safari on macOS, enable Developer settings, go to the Develop menu -> from here you can inspect

# Deployment

## Android

1. Run `NODE_ENV={desired_env} cap sync android`
2. Bump the `versionCode` and if wanted `versionName` in `build.gradle`
3. Build the AAB via Build -> Generate Signed App Bundle ... This will build into `android/app/{flavor}/{build_type}/app-{flavor}-{buildtype}.aab`
4. Open the [Google Play Console](https://play.google.com/console/u/0/developers/8500628513458158038/app-list)
5. Go to Test and Release -> Create New Release

### Distribution

**Internal testing**

Copy the web link for inviting testers from the Google Play Console.

Updates can be seen, when published, in the Play Store app.

Note: if you previously had a debug build installed through Android Studio, you will need to delete that before trying to update it in the Play Store. Otherwise, the update will start but fail with a nondescript error.

## iOS

1. In the Project navigator -> App -> Build Settings, go to the Versioning section, adjust "Current Project Version" and "Marketing Version" as appropriate.
2. Go to Product -> Archive in the menu
3. Click "Distribute app"

### Distribution

**Internal testing**

Continue distributign for "TestFlight Internal Only".

Manage the App distribution & TestFlight settings in https://appstoreconnect.apple.com/
