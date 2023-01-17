## Logging into Firebase

```
# A. simple login. Will open a browser prompt
firebase login

# B. Use the following if you need to login using your WTMG Google Account address that has access to WTMG, but already have another active Firebase account elsewhere.

# Open web login prompt
firebase login:add
# Register this account with the current directory
firebase login:use <your_wtmg_email>

# Check if you have the right projects available
firebase projects:list

# Specify the project you want to target (wtmg-dev or wtmg-production)
firebase use wtmg-dev
```

## Env variables explained

Create a `.env` file and make sure it has the values specified in [`.env.example`](https://github.com/WelcometoMyGarden/welcometomygarden/blob/master/.env.example).

For the backend, your `.runtimeconfig.json` will need:

- `frontend.url`: the "callback URL" endpoint, typically where your frontend dev server is running (`http://localhost:5173`) if you're dveloping locally. In production, this will be `https://welcometomygarden.org`.
- `stripe.secret_key` & `stripe.webhook_secret`: backend keys for Stripe. Use test keys when developing.
- `sendgrid.key`: a SendGrid API key, now only used to send email. Use a development key when developing.
