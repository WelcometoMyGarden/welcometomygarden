Note: this uses firebase-admin version 9, that is a version before 10.

[Version 10 introduced a major architecture rewrite](https://firebase.google.com/docs/admin/migrate-node-v10).

## Get started

### Install

```
yarn install
```

### Set up Firebase

Install the [Firebase CLI](https://firebaseopensource.com/projects/firebase/firebase-tools/), if you don't have it already.

```
yarn global add firebase-tools
```

Then, set up the Firebase project.

```
# A. simple login. Will open a browser prompt
firebase login

# B. Use the following if you need to login using your WTMG Google Account address that has access to WTMG, but already have another active Firebase account elsewhere.

# Open web login prompt
firebase login:add
# Register this account with the current directory
firebase login:use <your_wtmg_email>

# Specify the project you want to target (wtmg-dev or wtmg-production)
firebase use wtmg-dev
```

### Configure the environment

See https://firebase.google.com/docs/functions/local-emulator#set_up_functions_configuration_optional

```
firebase functions:config:get > .runtimeconfig.json
```

Will output the following, which will be picked up by the emulators:

```

{
  "sendgrid": {
    "key": "<secret_sendgrid_key>"
  },
  "frontend": {
    "url": "https://staging.welcometomygarden.org"
  }
}
```

You can replace "frontend" with the localhost URL where you are currently running whe WTMG Svelte client app, if you want.

### Start dev servers

```
yarn serve
```

See package.json for alternative commands, as well as the `firebase` command itself.
