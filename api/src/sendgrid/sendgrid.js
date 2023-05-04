// @ts-check
const sendgridClient = require('@sendgrid/client');
const functions = require('firebase-functions');

const SG_KEY = functions.config().sendgrid.marketing_key;
if (SG_KEY) {
  sendgridClient.setApiKey(SG_KEY);
}

exports.sendgrid = sendgridClient;

/**
 * @type {string}
 */
const SG_WTMG_NEWS_YES_ID = functions.config().sendgrid.newsletter_list_id;
exports.SG_WTMG_NEWS_YES_ID = SG_WTMG_NEWS_YES_ID;
exports.SG_KEY = SG_KEY;

// Destructure Firebase config into constants
const {
  wtmg_id: SG_WTMG_ID_FIELD_ID,
  superfan: SENDGRID_SUPERFAN_FIELD_ID,
  communication_language: SG_COMMUNICATION_LANG_FIELD_ID,
  // NOTE: For lat_sign_in_time to be representative, we need to update this when somebody logs in.
  // Takes some more setup:
  // https://stackoverflow.com/questions/46452921/can-cloud-functions-for-firebase-execute-on-user-login
  // last_sign_in_time: SG_LAST_SIGN_IN_TIME_FIELD_ID,
  creation_time: SG_CREATION_TIME_FIELD_ID,
  creation_language: SG_CREATION_LANGUAGE_FIELD_ID,
  host: SG_HOST_FIELD_ID
} = /** @type {{[key: string]: string}} */ (functions.config().sendgrid.field_ids ?? {});

exports.SG_WTMG_ID_FIELD_ID = SG_WTMG_ID_FIELD_ID;
exports.SENDGRID_SUPERFAN_FIELD_ID = SENDGRID_SUPERFAN_FIELD_ID;
exports.SG_COMMUNICATION_LANG_FIELD_ID = SG_COMMUNICATION_LANG_FIELD_ID;
exports.SG_CREATION_TIME_FIELD_ID = SG_CREATION_TIME_FIELD_ID;
exports.SG_CREATION_LANGUAGE_FIELD_ID = SG_CREATION_LANGUAGE_FIELD_ID;
exports.SG_HOST_FIELD_ID = SG_HOST_FIELD_ID;
