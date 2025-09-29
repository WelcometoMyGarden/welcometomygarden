## Connecting to a local development server

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

## Icon/splash screen generation

See https://github.com/ionic-team/capacitor-assets, which is invoked for our purposes here [tools/generatemobileicons.sh](../tools/generatemobileicons.sh)

## Environment

The iOS scheme "App" is connected to the target "App".
Switching schemes now has the main goal of switching the Firebase Messaging backend attached to it.

Use commands like:

```bash
NODE_ENV=devpush|prod|beta|(default=staging) cap copy|run|sync
```

This overrides the server url.

**Android Build Types and iOS Xcode Schemes**

Insert the following files:

**Android**

```bash
./android/app/google-services.json # staging service file, used in general debug builds
./android/app/src/staging/google-services.json # staging service file, used in staging builds
./android/app/src/release/google-services.json # production service file, used in release builds
```

For these files, use the right sidebar in Xcode to set the "target membership" to the "App" and "Staging" schemes (one each) respectively.

**iOS**

```bash
./ios/App/App/FirebaseProd/GoogleService-Info.plist # production service file
./ios/App/App/FirebaseStaging/GoogleService-Info.plist # staging service file
```
