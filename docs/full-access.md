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
- `stripe.secret_key` & `stripe.webhook_secret`: backend keys for Stripe. Use test keys when developing. - `sendgrid.send_key`: a SendGrid API key, only used to send email. We currently use these in both staging and production environments, so that we can reuse created Dynamic Templates. **This might result in hard-to-test scenarios regarding unsubscribe group emails** (production SendGrid groups will not affect the staging contacts)
- `sendgrid.marketing_key`: a SendGrid API key, only used to perform operations with the SendGrid Marketing API (e.g. syncing contacts). This one differs between the production & staging environments.

## Static image assets

Some of our static assets live in a simple Google Cloud bucket.

In the bucket file management API, it's possible to drag & drop in a second version of a file onto an existing one (e.g. with a rescaled resolution), and specify to "replace" it in the dialog that appears. However:

- this will not actually create a second version in the bucket's object versioning history, for that the API probably needs to be used.
- the authenticated URL will update quickly, but the public URL (which we use for the static site) will be plagued **by inexplicable old cached versions that randomly appear** for some time (1 day?), see [this StackOverflow comment too](https://stackoverflow.com/a/37671993/4973029), regardless of cache headers. Probably due to intermediary caches.
