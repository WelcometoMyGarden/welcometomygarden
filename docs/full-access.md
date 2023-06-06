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

**Google Cloud bucket assets**

Some of our static assets live in a simple Google Cloud bucket.

In the bucket file management API, it's possible to drag & drop in a second version of a file onto an existing one (e.g. with a rescaled resolution), and specify to "replace" it in the dialog that appears. However:

- this will not actually create a second version in the bucket's object versioning history, for that the API probably needs to be used.
- the authenticated URL will update quickly, but the public URL (which we use for the static site) will be plagued **by inexplicable old cached versions that randomly appear** for some time (1 day?), see [this StackOverflow comment too](https://stackoverflow.com/a/37671993/4973029), regardless of cache headers. Probably due to intermediary caches.

**Dynamically generated responsive SvelteKit assets**

For some newer components, we started dynamically generating responsive images on build-time, rather than using one-size static images hosted in a bucket, using [svelte-img](https://github.com/zerodevx/svelte-img).

The source images for this process should be put in `src/lib/assets`, but are not checked into the Git repo.

We keep them in this [Google Drive](https://drive.google.com/drive/folders/1OcaKJa9VoykflvKNv6nH13O0Ho_PcApF?usp=sharing).

It's possible to sync your local version with the Google Drive, in both ways, with several tools. Here are some guidelines for [rclone](https://rclone.org/drive/):

Uploading local files:

```
rclone sync src/lib/assets slowby-gdrive:Development/assets
```

`bisync` can be used to both download and upload.

This assumes `slowby-gdrive` is configured as a Google Drive remote, and that "Development" is a shortcut to the Development folder in our team drive. Check with the team to receive a client ID & secret you can use for the configuration.
