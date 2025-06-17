const { defineString, defineBoolean } = require('firebase-functions/params');
const removeEndingSlash = require('./util/removeEndingSlash');

const frontendUrlParam = defineString('FRONTEND_URL');
exports.frontendUrl = () => removeEndingSlash(frontendUrlParam.value());

const dashboardUrlParam = defineString('DASHBOARD_URL');
exports.dashboardUrl = () => removeEndingSlash(dashboardUrlParam.value());

// SENDGRID
// Required
exports.sendgridMarketingKeyParam = defineString('SENDGRID_MARKETING_KEY');
// Not required locally
exports.sendgridSendKeyParam = defineString('SENDGRID_SEND_KEY', { default: '' });

exports.sendgridContactSyncDisabledParam = defineBoolean('SENDGRID_DISABLE_CONTACTS', {
  default: false
});

/**
 * Don't allow sending email when there is no API key for it, or the API key is not the production key.
 * For now, we have only configured mail templates in the production environment.
 */
exports.canSendMail = () => !!this.sendgridSendKeyParam.value();

exports.isContactSyncDisabled = () => this.sendgridContactSyncDisabledParam.value();

exports.sengridWtmgIdFieldIdParam = defineString('SENDGRID_FIELD_IDS_WTMG_ID');
exports.sendgridCommunicationLanguageFieldIdParam = defineString(
  'SENDGRID_FIELD_IDS_COMMUNICATION_LANGUAGE'
);
exports.sendgridSuperfanFieldIdParam = defineString('SENDGRID_FIELD_IDS_SUPERFAN');
exports.sendgridHostFieldIdParam = defineString('SENDGRID_FIELD_IDS_HOST');
exports.sendgridCreationLanguageFieldIdParam = defineString('SENDGRID_FIELD_IDS_CREATION_LANGUAGE');
exports.sendgridCreationTimeFieldIdParam = defineString('SENDGRID_FIELD_IDS_CREATION_TIME');
exports.sendgridSecretFieldIdParam = defineString('SENDGRID_FIELD_IDS_SECRET');
exports.sendgridNewsletterFieldIdParam = defineString('SENDGRID_FIELD_IDS_NEWSLETTER');
exports.sendgridListedFieldIdParam = defineString('SENDGRID_FIELD_IDS_LISTED');
exports.sendgridGardenPhotoFieldIdParam = defineString('SENDGRID_FIELD_IDS_GARDEN_PHOTO');

exports.sendgridWtmgNewsletterListId = defineString('SENDGRID_NEWSLETTER_LIST_ID');
//
// NOTE on potentially using last_sign_in_time in the future: For last_sign_in_time to be representative, we need to update this when somebody logs in.
// Takes some more setup:
// https://stackoverflow.com/questions/46452921/can-cloud-functions-for-firebase-execute-on-user-login
// last_sign_in_time: SG_LAST_SIGN_IN_TIME_FIELD_ID,
//

// STRIPE
const stripeWebhookAcceptVersionParam = defineString('STRIPE_VERSION', {
  description:
    'The webhook events version name accepted by this deployment, taken from the ?version= query parameter',
  default: ''
});
exports.getStripeVersion = () => stripeWebhookAcceptVersionParam.value();

// SUPABASE
const supabaseDisableReplicationParam = defineBoolean('SUPABASE_DISABLE_REPLICATION', {
  default: false
});
exports.isSupabaseReplicationDisabled = () => supabaseDisableReplicationParam.value();
exports.shouldReplicateRuntime = () => !supabaseDisableReplicationParam.value();

// SENTRY
exports.sentryHost = defineString('SENTRY_HOST');
