```
cap sync
cap open ios
```

To make Capacitor connect to the Vite Dev server in the app web view, you need to:

1. Install a custom hosts file
2. Install the local mkcert HTTPS root CA.

# iOS

Installing the root CA is easy: just drag the `rootCA.pem` file on the simulator window.

The simulator also uses the host's `/etc/hosts` (edit `/private/etc/hosts` as root).

# Android
