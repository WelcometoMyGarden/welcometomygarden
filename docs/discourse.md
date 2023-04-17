# Discourse x WTMG

Superfans get access to a slow travel Discourse community, which is hosted in production at [https://community.welcometomygarden.org](https://community.welcometomygarden.org).

We seamlessly reuse WTMG's Firebase login using [Discourse Connect](https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045), and a combination of an intermediate sign-in portal `src/routes/auth/discourse-connect/+page.svelte` in the frontend and a cloud function (`api/src/discourseConnectLogin.js`) to handle the authentication in the backend.

## Setting up the Discourse development environemnt

To test and develop on this integration, set up your Discourse development environment in unison with the Firebase development environment described in the readme:

- [Discourse Docker development environment](https://meta.discourse.org/t/install-discourse-for-development-using-docker/102009) (at the moment of writing, only viable for x86_64 machines, thus not ARM64 Macs)
- [Discourse Docker native install for macOS (incl. M1)](https://meta.discourse.org/t/install-discourse-on-macos-for-development/15772) (more dependencies to configure, more cumbersome)

Note that the Docker dev env can also be exposed on `0.0.0.0`, thus to your local network, via the `d/boot_dev -p` param. That way, you can run the Docker setup on a x84_64 machine, and access that development environment with a Firebase development environment on an M1 Mac.

Then, set the required secret in `.runtimeconfig.json`, as well as the `VITE_DISCOURSE_HOST` variable on the frontend (see examples). Configure Discourse according to the Discourse Connect instructions linked above.

## Quick admin login without Firebase SSO activated

If you previously set up an admin account in Discourse, and you remember your admin email address, you can bypass SSO [by opening](https://meta.discourse.org/t/log-back-in-as-admin-after-locking-yourself-out-with-read-only-mode-or-an-invalid-sso-configuration/89605) `/u/admin-login` on Discourse and snooping out the magic login link sent with MailHog. Take care to replace the Docker-internal `localhost:3000` in the magic link with the exported `your-local-ip:4200`.

## Discourse Theming

See [this guide](https://meta.discourse.org/t/designers-guide-to-getting-started-with-themes-in-discourse/152002/9), and/or [this one](https://meta.discourse.org/t/beginners-guide-to-developing-discourse-themes/93648). Using Theme CLI is the most convenient.

## Using Theme Creator

[Follow this guide](https://meta.discourse.org/t/get-started-with-theme-creator-and-the-theme-cli/108444).

The approach is not recommended, because it does not seem like we can configure the admin settings of the Theme Creator demo site, which makes us unable to replicate the layout we have in production. Maybe suitable for small generic fixes.

## Local dev

Go to the Admin page -> API tab, create a new key [according to instructions](https://meta.discourse.org/t/install-the-discourse-theme-cli-console-app-to-help-you-build-themes/82950#credentials-6)

To upload, first run `discourse_theme watch theme_folder`. You can then create a new theme, or overwrite the first one. [See docs](https://github.com/discourse/discourse_theme).

**It does not seem to be possible to connect to a production environment with the CLI, even if a valid key is provided.** The connection times out. I also don't find docs about this.

## Deployment

We deploy by importing the theme from Github. See the [discourse-theme](https://github.com/WelcometoMyGarden/discourse-theme) repo.

## Keep in mind

Our theme does user agent detection to switch styles for mobile devices (class="mobile-view"), you can emulate this with browser tools
