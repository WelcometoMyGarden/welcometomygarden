const { defineString } = require('firebase-functions/params');
const { sendgridMail } = require('./sendgrid/sendgrid');
const devSend = require('./util/devMail');
const { frontendUrl, canSendMail } = require('./sharedConfig');

/**
 * See https://github.com/sendgrid/sendgrid-nodejs/tree/main/packages/mail
 */
const send = (msg) => sendgridMail.send(msg);

const NO_API_KEY_WARNING =
  "You don't have an SendGrid API key set in the environment. " +
  'No emails will be sent. Inspect the logs to see what would have been sent by email';

/**
 * @param {string} verificationLink
 */
function makeVerificationLinkLocal(verificationLink) {
  return verificationLink.replace(/http:\/\/[^/]+\/emulator/, `${frontendUrl()}/auth`);
}

/**
 *
 * @param {SendGrid.MailDataRequired} msg
 * @param {Record<string, any>} obj
 */
const insertInDynamicTemplateData = (msg, obj) => ({
  ...msg,
  dynamicTemplateData: {
    ...msg.dynamicTemplateData,
    // Make it retrievable in a local email
    ...obj
  }
});

/**
 * To help debugging the /auth/action verification links in a realistic way,
 * transform /emulator/action auth URLs to frontend /auth/action page URLs, which is the way they will be
 * handled in production.
 * @param {string} verificationLink
 */
function logActionLink(verificationLink) {
  if (verificationLink.includes('/emulator/action')) {
    console.info(
      'Transformed /auth/action URL: ',
      `"${makeVerificationLinkLocal(verificationLink)}"`
    );
  }
}

/**
 * @param {string} email
 * @param {string} name
 * @param {string} verificationLink
 * @param {string} language
 * @param {'creation' | 'change'} type
 */
exports.sendAccountVerificationEmail = (
  email,
  name,
  verificationLink,
  language,
  type = 'creation'
) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-56d23ef8795d470eb4a615101f45a1bb';
      break;
    case 'nl':
      templateId = 'd-3bfeec1f2b3d4849bb725c74805f8592';
      break;
    default:
      templateId = 'd-9fa3c99cbc4e410ca2d51db0f5048276';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName: name,
      verificationLink,
      type
    },
    categories: ['Account verification email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(
      insertInDynamicTemplateData(
        msg,
        // Make it retrievable in a local email
        { actionLink: makeVerificationLinkLocal(verificationLink) }
      ),
      'accountVerificationEmail'
    );
    logActionLink(verificationLink);
    return Promise.resolve();
  }

  return send(msg);
};

exports.sendPasswordResetEmail = (email, name, resetLink) => {
  // TODO: we only have this one in English?
  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId: 'd-e30e97d29db9487aaea9b690c84ca7b0',
    dynamicTemplateData: {
      firstName: name,
      resetLink
    },
    categories: ['Password reset email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    logActionLink(resetLink);
    devSend(
      insertInDynamicTemplateData(
        msg,
        // Make it retrievable in a local email
        { actionLink: makeVerificationLinkLocal(resetLink) }
      ),
      'passwordResetEmail'
    );
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @typedef {Object} MessageReceivedConfig
 * @property {string} email
 * @property {string} firstName
 * @property {string} senderName
 * @property {string} message
 * @property {string} messageUrl
 * @property {boolean} superfan
 * @property {string} language
 */

const inboundParseEmailParam = defineString('SENDGRID_INBOUND_PARSE_EMAIL');

/**
 * @param {MessageReceivedConfig} config
 * @returns
 */
exports.sendMessageReceivedEmail = (config) => {
  const { email, firstName, senderName, message, messageUrl, superfan, language } = config;

  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-274cca0cb26b4c3d9d2bfd224d5aa6f0';
      break;
    case 'nl':
      templateId = 'd-bddbb11eae8849d29eda3d90bad6534c';
      break;
    default:
      templateId = 'd-9f8e900fee7d49bdabb79852de387609';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    replyTo: `Welcome To My Garden <${inboundParseEmailParam.value()}>`,
    templateId,
    dynamicTemplateData: {
      firstName,
      senderName,
      messageUrl,
      message,
      superfan
    },
    categories: ['New chat message notification email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'messageReceivedEmail');
    return Promise.resolve();
  }

  return send(msg);
};

exports.sendEmailReplyError = (toEmail, language) => {
  let templateId;
  switch (language) {
    case 'nl':
      templateId = 'd-92fa096fb981407699057f091d3f9c8e';
      break;
    case 'fr':
      templateId = 'd-54a45c1d6fb341898a83c3e157a38f91';
      break;
    default:
      templateId = 'd-24c51c1b6e324edc9f79ee214eba1af6';
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: toEmail,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    categories: ['Email reply error notification email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'emailReplyError');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 *
 * @param {string} language
 * @param {string} email
 * @param {string} firstName
 * @returns
 */
exports.sendSubscriptionConfirmationEmail = (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-5f9ab48669e545669511a64789a50c92';
      break;
    case 'nl':
      templateId = 'd-bd1e491ad7a6463bac3649eb91d3a342';
      break;
    default:
      templateId = 'd-239412fbd44141e0a227c32b4d75b906';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName,
      exploreFeaturesLink: `${frontendUrl()}/explore`
    },
    categories: ['Subscription confirmation email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'subscriptionConfirmationEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @typedef {Object} SubscriptionRenewalConfig
 * @property {string} email
 * @property {string} firstName
 * @property {number} price expected to be an integer
 * @property {string} renewalLink
 * @property {string} language
 */

/**
 * This is the first email that informs members that they can renew.
 * @param {SubscriptionRenewalConfig} config
 * @returns
 */
exports.sendSubscriptionRenewalEmail = (config) => {
  const { email, firstName, price, renewalLink, language } = config;
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-97e7ad7457d14f348833cb32a6143e33';
      break;
    case 'nl':
      templateId = 'd-8efa4a0675c14098b9acd2d747e4db74';
      break;
    default:
      templateId = 'd-77f6b26edb374b4197bdd30e2aafda03';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName,
      price,
      renewalLink
    },
    categories: ['Subscription renewal email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'subscriptionRenewalEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @param {SubscriptionRenewalConfig} config
 * @returns
 */
exports.sendSubscriptionRenewalReminderEmail = (config) => {
  const { email, firstName, renewalLink, language, price } = config;
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-8ea6f695b5614d8199aab6c0f42602f1';
      break;
    case 'nl':
      templateId = 'd-f76d5ce57c6c48e3bf1db925f16d7a0b';
      break;
    default:
      templateId = 'd-ff6078d95b984130ba2e2512f77cbdba';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName,
      renewalLink,
      price
    },
    categories: ['Subscription renewal reminder email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'subscriptionRenewalReminderEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionEndedEmail = (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-78968e5eeec94a498c5e21cc70a7eedf';
      break;
    case 'nl':
      templateId = 'd-195cdd1b8a92461c89595ea585b49b21';
      break;
    default:
      templateId = 'd-029a0be7ca0e4a01821f6faa9c13e936';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription ended email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'subscriptionEndedEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionRenewalThankYouEmail = (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-180e7b9764c64552a5f9715606432858';
      break;
    case 'nl':
      templateId = 'd-04a338e3ecee43a1bf2a941a9b39ffdb';
      break;
    default:
      templateId = 'd-bda2656ade9a4efd97650ed9df43de39';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription renewal Thank You email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'subscriptionRenewalThankYouEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionEndedFeedbackEmail = (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-697222fe8ed84b73bcf23266133ac41a';
      break;
    case 'nl':
      templateId = 'd-1e50ecaf26564d06b634c53dc60ab900';
      break;
    default:
      templateId = 'd-67a50fcf0c394b779baa82c71cd21634';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription ended feedback email']
  };

  if (!canSendMail()) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    devSend(msg, 'subscriptionEndedFeedbackEmail');
    return Promise.resolve();
  }

  return send(msg);
};
