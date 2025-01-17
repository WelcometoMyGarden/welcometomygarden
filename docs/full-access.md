## Logging into Firebase

The method differs when you have multiple Firebase accounts active on your machine, or not.

If your WTMG Google account is your only account, this should work:

```bash
firebase login
```

Use the following if you already have another active Firebase account elsewhere.

```bash
# Open the web login prompt
firebase login:add

# Register the WTMG account with the current directory
firebase login:use <your_wtmg_email>
```

### Switching between staging & production

```bash
# Check if you have the right projects available
firebase projects:list

# Specify the project you want to target ("wtmg-dev" a.k.a. "staging" or "wtmg-production" a.k.a. "prod")
firebase use wtmg-dev
```

## Environment variables explained

### Frontend (SvelteKit)

Create a `.env.development.local` file and make sure it has the values specified in [`.env.example`](https://github.com/WelcometoMyGarden/welcometomygarden/blob/master/.env.example). This allows you to develop with the local Firebase "demo" project.

SvelteKit uses Vite, and hence also [Vite env modes via dotenv](https://vitejs.dev/guide/env-and-mode.html#modes) behind the scenes. To test/debug cloud messaging via FCM, you need to connect to the remote `wtmg-dev` staging environment, and have the right values set up in `.env.staging.local`. This will be used by the `dev:staging` in NPM.

### Backend

We use Firebase Functions v2 with parameterized environment configuration.

You will need several environment files for the backend in the `api` directory: `.env.local` (for local emulator testing), `.env.staging` (for the wtmg-dev/staging Firebase project) and `.env.prod` (for the wtmg-production/prod Firebase project).

- `FRONTEND_URL`: the "callback URL" endpoint, typically where your frontend dev server is running (`http://localhost:5173`) if you're developing locally. In production, this will be `https://welcometomygarden.org`.

**For Stripe (subscriptions integration)**

- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: backend keys for Stripe. Use test keys when developing. - `sendgrid.send_key`: a SendGrid API key, only used to send email. We currently use these in both staging and production environments, so that we can reuse created Dynamic Templates. **This might result in hard-to-test scenarios regarding unsubscribe group emails** (production SendGrid groups will not affect the staging contacts)
- `STRIPE_VERSION`: the Stripe API version number (including the plant suffix) to be used for both the Node.js API and the webhook event decoding. This is used in handling [updates to versions](https://docs.stripe.com/webhooks/versioning). Webhook event versions are parsed from the `?version` query parameter of a webhook

**For SendGrid (email sending & contact syncing)**

- `SENDGRID_SEND_KEY`: a SendGrid API key with permission to send mail. When added, it is used to send mail. Make sure the dynamic templates referenced in the codebase (mainly: `mail.js`) exist within the SendGrid workspace.
- `SENDGRID_DISABLE_CONTACTS`: set to `true` if you wish to disable integrations with the Marketing API, for example for local testing of unrelated features.
- `SENDGRID_MARKETING_KEY`: a SendGrid API key only used to perform operations with the SendGrid Marketing API (e.g. syncing contacts). This key differs between the production & staging environments.
- `SENDGRID_FIELD_IDS_*`: a map of SendGrid Custom Field IDs to be used with contact syncing.
- `SENDGRID_INBOUND_PARSE_EMAIL`: the email address to which chat response emails should be sent (see [SendGrid Inbound Parse](https://docs.sendgrid.com/ui/account-and-settings/inbound-parse))

**For Supabase (read-only analytics replica)**

- `SUPABASE_DISABLE_REPLICATION`: set to `true` if you wish to disable replication to a Supabase Postgres database, for example, for local testing of unrelated features.
- `SUPABASE_API_URL`: the URL including protocol of the Supabase PostgREST API.
- `SUPABASE_SERVICE_ROLE_KEY`: the key to authenticate with the API.

**For the Discourse Connect SSO integration**

Note that these should have empty values in the staging config, since we do not have a publicly hosted staging Discourse environment. Locally, you can use these variables to connect to a local Discourse server, see [the docs](./discourse.md).

- `DISCOURSE_HOST`
- `DISCOURSE_API_KEY`
- `DISCOURSE_CONNECT_SECRET`

## Static image assets

**Google Cloud bucket assets**

Some of our static assets live in a simple Google Cloud bucket.

In the bucket file management API, it's possible to drag & drop in a second version of a file onto an existing one (e.g. with a rescaled resolution), and specify to "replace" it in the dialog that appears. However:

- this will not actually create a second version in the bucket's object versioning history, for that the API probably needs to be used.
- the authenticated URL will update quickly, but the public URL (which we use for the static site) will be plagued **by inexplicable old cached versions that randomly appear** for some time (1 day?), see [this StackOverflow comment too](https://stackoverflow.com/a/37671993/4973029), regardless of cache headers. Probably due to intermediary caches.

**Dynamically generated responsive SvelteKit assets**

For some newer components, we started dynamically generating responsive images on build-time, rather than using one-size static images hosted in a bucket, using [svelte-img](https://github.com/zerodevx/svelte-img).

The source images for this process should be put in `src/lib/assets`, but are not checked into the Git repo.

We keep them in a Google Cloud bucket (and maybe in [Google Drive](https://drive.google.com/drive/folders/1OcaKJa9VoykflvKNv6nH13O0Ho_PcApF?usp=sharing)).

It's possible to sync your local version with the Google Drive, in both ways, with several tools. Here are some guidelines for [rclone](https://rclone.org/drive/):

Uploading local files:

```
rclone copy --exclude="**.DS_Store" src/lib/assets gcloud:wtmg-static/assets
```

```
rclone copy --exclude="**.DS_Store" src/lib/assets slowby-gdrive:Development/assets
```

`bisync` can be used to both download and upload.

This assumes:

- `gcloud` is configured as a Google Cloud Storage remote. Check with the team to copy configuration.
- `slowby-gdrive` is configured as a Google Drive remote, and that "Development" is a shortcut to the Development folder in our team drive. Check with the team to receive a client ID & secret you can use for the configuration.

In the future, we should maybe consider blowing up our repository size to 10s to 100s of megabytes anyway, to get the benefits of version control for source images, and to not have to deal with an external storage system like now. See [this discussion](https://softwareengineering.stackexchange.com/questions/80962/should-images-be-stored-in-a-git-repository).
