# Welcome To My Garden [![Open Collective backers and sponsors](https://img.shields.io/opencollective/all/welcometomygarden?label=Support%20through%20Open%20Collective&logo=open-collective)](https://opencollective.com/welcometomygarden) ![GitHub](https://img.shields.io/github/license/welcometomygarden/welcometomygarden?label=License) [![Translation status](https://hosted.weblate.org/widgets/wtmg/-/svg-badge.svg)](https://hosted.weblate.org/engage/wtmg/)

This repository houses the entire Welcome To My Garden app. Contribution guidelines will be added soon!

Problems, feedback or questions are welcome in [issues](https://github.com/WelcometoMyGarden/welcometomygarden/issues) or on our [Slack](https://join.slack.com/t/welcometomygarden/shared_invite/zt-f31i37dj-_zFgnfe40B6EexJuB2f_~w).

## Prerequisites

- [Node](https://nodejs.org/en/download/) version >=10 installed
- This project uses the [Yarn](https://yarnpkg.com/getting-started/install) package manager

Create a `.env` file and make sure it has the values specified in [`.env.example`](https://github.com/WelcometoMyGarden/welcometomygarden/blob/master/.env.example).

You will need a Mapbox access token if you'd like to work on features that concern the map.

## Usage

From a terminal located at the project root, install project dependencies:

```bash
yarn
```

Start the project in development mode

```
yarn run dev
```

## Testing

[Playwright](https://playwright.dev/) is set up for e2e testing.

After running `yarn install`, also install the testing browsers:

```
npx playwright install
```

To check if your code won't have compilation issues in production, do a production build locally and preview the result:
```
yarn build:prod
yarn preview
```

## Translations

The website is translated through [Hosted Weblate](https://hosted.weblate.org/projects/wtmg/).
You can easily make an account and start translating in their web-environment - no installation required.

[![Translation status](https://hosted.weblate.org/widgets/wtmg/-/multi-auto.svg)](https://hosted.weblate.org/engage/wtmg/)

## Firebase

Welcome To My Garden is a project running on Firebase, which is configured with `/.firebaserc`.

Follow Firebase documentation to [manage, test and deploy Firestore security rules](https://firebase.google.com/docs/rules/manage-deploy]).

### API

The `/api` folder in this repository is a sub-project that contains the source code for the Firebase Cloud Functions used by this project.

Some of the functions are only used by administrators, and are not used by the frontend client in this repository.

## License

![GitHub](https://img.shields.io/github/license/welcometomygarden/welcometomygarden?label=License)
