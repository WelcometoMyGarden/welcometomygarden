// There is an error thrown by deleteToken(messaging()) if this file is not found.
// Maybe its mere presence will help.

// https://firebase.google.com/docs/cloud-messaging/js/client#access_the_registration_token
// > FCM requires a firebase-messaging-sw.js file. Unless you already have a firebase-messaging-sw.js file, create an empty file with that name and place it in the root of your domain before retrieving a token. You can add meaningful content to the file later in the client setup process.
// https://firebase.google.com/docs/cloud-messaging/js/receive
// > In order to receive the onMessage event, your app must define the Firebase messaging service worker in firebase-messaging-sw.js. Alternatively, you can provide an existing service worker to the SDK through getToken(): Promise<string>.
