const { defineString } = require('firebase-functions/params');
const { sendgridMail } = require('./sendgrid/sendgrid');
const devSend = require('./util/devMail');
const { frontendUrl, canSendMail, dashboardUrl } = require('./sharedConfig');
const { coerceToMainLanguage } = require('./util/mail');

/**
 * See https://github.com/sendgrid/sendgrid-nodejs/tree/main/packages/mail
 * @param {SendGrid.MailDataRequired} msg
 */
const send = (msg) => sendgridMail.send(msg);

/**
 * Since this code is public, trump simplistic email scrapers.
 * @returns
 */
const buildEmail = (handle, domain) => `${handle}@${domain}`;
const WTMG_DOMAIN = 'welcometomygarden.org';

const SUPPORT_FROM = `Welcome To My Garden <${buildEmail('support', WTMG_DOMAIN)}>`;
const manonFrom = (lang) => ({
  email: 'news@welcometomygarden.org',
  name: `Manon ${{ en: 'from', nl: 'van', fr: 'de' }[coerceToMainLanguage(lang)]} WTMG`
});

const WELCOME_FLOW_CATEGORY = 'Welcome flow - March 2025';

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
    // eslint-disable-next-line no-console
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName: name,
      verificationLink,
      type
    },
    categories: ['Account verification email']
  };

  if (!canSendMail()) {
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

/**
 * First welcome flow email
 * @param {string} email
 * @param {string} name
 * @param {string} language
 */
exports.sendWelcomeEmail = (email, name, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-42bf200286244fdc9b711ec76ed5da83';
      break;
    case 'nl':
      templateId = 'd-a54082a700a542d3b4c670548aa738a9';
      break;
    default:
      templateId = 'd-9dcd73d8a12b4b898e94672dcc06dcd4';
      break;
  }
  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: manonFrom(language),
    templateId,
    dynamicTemplateData: {
      // first_name is the SG contact, but it may not be ready yet
      firstName: name,
      first_name: name
    },
    categories: [WELCOME_FLOW_CATEGORY]
  };

  if (!canSendMail()) {
    devSend(msg, 'welcomeEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * Fourth welcome flow email
 */
exports.sendBecomeMemberEmail = (email, name, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-48634647feb5440e8529aff60b399b27';
      break;
    case 'nl':
      templateId = 'd-6447239cc18d427c84aa0bc3e305be89';
      break;
    default:
      templateId = 'd-f772a5b1a28648aca5b4745765faeef5';
      break;
  }
  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: manonFrom(language),
    templateId,
    dynamicTemplateData: {
      // first_name is the SG contact, but it may not be ready yet
      firstName: name,
      first_name: name
    },
    categories: [WELCOME_FLOW_CATEGORY]
  };

  if (!canSendMail()) {
    devSend(msg, 'becomeMemberEmail');
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
    from: SUPPORT_FROM,
    templateId: 'd-e30e97d29db9487aaea9b690c84ca7b0',
    dynamicTemplateData: {
      firstName: name,
      resetLink
    },
    categories: ['Password reset email']
  };

  if (!canSendMail()) {
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
    from: SUPPORT_FROM,
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
    devSend(msg, 'messageReceivedEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 *
 * @param {Omit<MessageReceivedConfig, 'superfan'>} config
 * @returns
 */
exports.sendMessageReminderEmail = (config) => {
  const { email, firstName, senderName, message, messageUrl, language } = config;

  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-c84de1e31a02475895db0c4f5cb5728e';
      break;
    case 'nl':
      templateId = 'd-99b7729b9b5545e49fddb1dd9915ea25';
      break;
    default:
      templateId = 'd-21616b12e97f4bb38a61b4a762f907a8';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    replyTo: `Welcome To My Garden <${inboundParseEmailParam.value()}>`,
    templateId,
    dynamicTemplateData: {
      firstName,
      senderName,
      messageUrl,
      message
    },
    categories: ['Chat message reminder email']
  };

  if (!canSendMail()) {
    devSend(msg, 'messageReminderEmail');
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
    from: SUPPORT_FROM,
    templateId,
    categories: ['Email reply error notification email']
  };

  if (!canSendMail()) {
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      exploreFeaturesLink: `${frontendUrl()}/explore`
    },
    categories: ['Subscription confirmation email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionConfirmationEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 *
 * @param {string} email
 * @param {string} language
 * @param {string} firstName
 * @returns
 */
exports.sendAbandonedCartReminderEmail = async (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-fb0c0ce07e204c76b61cfa2e1adb5534';
      break;
    case 'nl':
      templateId = 'd-15dd743516ef48d2a2dce09db0ea7a18';
      break;
    default:
      templateId = 'd-f2d51fe4165a46328b32c30aa8b279ef';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Abandoned cart reminder email']
  };

  if (!canSendMail()) {
    devSend(msg, 'abandonedCartReminderEmail');
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

/** @typedef {Omit<SubscriptionRenewalConfig, "renewalLink"> & {portalLink: string}} AutomaticRenewalConfig */

/**
 * This is the first email that informs members that they can renew.
 *
 * In SendGrid: [WTMG] Renewal 7 days before - Manual
 * (called as such because we give send_invoice renewals 7 days leeway for manual ren)
 *
 * @param {SubscriptionRenewalConfig} config
 * @returns
 */
exports.sendSubscriptionRenewalEmail = async (config) => {
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      price,
      renewalLink
    },
    categories: ['Subscription renewal email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionRenewalEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * This is the first email that informs members on charge_automatically that a renewal is upcoming.
 * The timing is set in Stripe's dashboard.
 *
 * In SendGrid: [WTMG] Renewal 7 days before - Automatic
 * (called as such because we give send_invoice renewals 7 days leeway for manual ren)
 *
 * @param {AutomaticRenewalConfig & {isSEPA: boolean, last4?: string, mandateReference?: string}} config
 * @returns
 */
exports.sendSubscriptionUpcomingRenewalEmail = async (config) => {
  const { email, firstName, price, portalLink, language, isSEPA, last4, mandateReference } = config;
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-3af2337427784cdfae2eca2842f761f3';
      break;
    case 'nl':
      templateId = 'd-77fb798c3ed54aa9b310b340561648ce';
      break;
    default:
      templateId = 'd-2885dbd9ff094816a1124b739614e9dd';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      price,
      portalLink,
      isSEPA,
      last4,
      mandateReference
    },
    categories: ['Subscription upcoming renewal email (automatic)']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionUpcomingRenewalEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @param {SubscriptionRenewalConfig} config
 * @returns
 */
exports.sendSubscriptionRenewalReminderEmail = async (config) => {
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      renewalLink,
      price
    },
    categories: ['Subscription renewal reminder email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionRenewalReminderEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * In SendGrid: [WTMG] Membership ended
 *
 * To be used when a send_invoice subscription ends, and when
 * a charge_automatically subscription ends naturally due to prior cancellation.
 *
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionEndedEmail = async (email, firstName, language) => {
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription ended email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionEndedEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * In SendGrid: [WTMG] Cancellation failed payment
 *
 * To be used when a send_invoice subscription ends, and when
 * a charge_automatically subscription ends naturally due to prior cancellation.
 *
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionAllPaymentsFailedEmail = async (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-cb1d00d44f8a498496bedf14ff466cf5';
      break;
    case 'nl':
      templateId = 'd-c9a423828faa4ef9b87eedbd620ef23a';
      break;
    default:
      templateId = 'd-dcd0fe5072a14294a66b74768ca2850d';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      renewalLink: `${frontendUrl()}/about-membership#pricing`
    },
    categories: ['Subscription ended email - payments failed (automatic)']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionEndedPaymentsFailedEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * In SendGrid: [WTMG] Renewal Thank You - Manual
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionManualRenewalThankYouEmail = async (email, firstName, language) => {
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription renewal Thank You email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionRenewalThankYouEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * In SendGrid: [WTMG] Renewal Thank You - Automatic
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @returns
 */
exports.sendSubscriptionAutomaticRenewalThankYouEmail = async (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-dddfc8742bcb41b9aeeb7a4bae363070';
      break;
    case 'nl':
      templateId = 'd-60902d1e2ea14100afeb11f7ddfcaee1';
      break;
    default:
      templateId = 'd-485c5a95e3114fd08c4ae8338d50ae66';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription renewal Thank You email (automatic)']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionRenewalAutomaticThankYouEmail');
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
exports.sendSubscriptionEndedFeedbackEmail = async (email, firstName, language) => {
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
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName
    },
    categories: ['Subscription ended feedback email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionEndedFeedbackEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 * @param {string} endDate
 * @returns
 */
exports.sendSubscriptionCancellationFeedbackEmail = async (email, firstName, language, endDate) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-168dfd45882a4e79825d94f3c54a5725';
      break;
    case 'nl':
      templateId = 'd-f52bd15d8ab740f6adb2c3e2cbb6e476';
      break;
    default:
      templateId = 'd-4ac312ec6c844a5eaf1f1cbb2a9d17f3';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      endDate
    },
    categories: ['Subscription cancellation confirmation + feedback email']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionCancellationFeedbackEmail');
    return Promise.resolve();
  }

  return send(msg);
};

/**

/**
 *
 * @param {Omit<AutomaticRenewalConfig, 'price'>} config does not include/need the price
 */
exports.sendCancelledRenewalReminderEmail2DaysEmail = async function (config) {
  const { email, firstName, portalLink, language } = config;
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-074781163ccb49dd912308adac8c0801';
      break;
    case 'nl':
      templateId = 'd-a8024029914d490b96d9d1a72d94c4fd';
      break;
    default:
      templateId = 'd-8170aba104644efe8f9db5d91d1d7734';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      portalLink
    },
    categories: ['Subscription cancelled renewal reminder 2 days (automatic)']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionCancelledRenewalReminderEmail2Days');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 *
 * @param {AutomaticRenewalConfig} config
 */
exports.sendCancelledRenewalReminderEmail7DaysEmail = async function (config) {
  const { email, firstName, price, portalLink, language } = config;
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-0f85d6590a8b45abbc91211b81662be1';
      break;
    case 'nl':
      templateId = 'd-24986e98357844e08bcb13eb03e71462';
      break;
    default:
      templateId = 'd-5596675ab31d44d0b80c2b1ca68ef6c7';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      price,
      portalLink
    },
    categories: ['Subscription cancelled renewal reminder 7 days (automatic)']
  };

  if (!canSendMail()) {
    devSend(msg, 'subscriptionCancelledRenewalReminderEmail7Days');
    return Promise.resolve();
  }

  return send(msg);
};

/**
 * @typedef {{
 *  firstName: string,
 *  lastName: string,
 *  lastMessage: string,
 *  email: string,
 *  uid: string
 * }} ChatNotificationEmailParams
 */

/**
 *
 * @param {ChatNotificationEmailParams} params
 */
exports.sendSpamAlertEmail = ({ firstName, lastName, lastMessage, email }) => {
  const msg = {
    subject: `Notification: ${firstName} sent 10 messages in the last 24 hours`,
    from: SUPPORT_FROM,
    to: [
      buildEmail('manon', WTMG_DOMAIN),
      buildEmail('dries', WTMG_DOMAIN),
      buildEmail('support', WTMG_DOMAIN)
    ],
    categories: ['10 messages notification email'],
    content: [
      {
        type: 'text/html',
        value: `<p>Hello,</p>

<p>The user "${firstName} ${lastName}" &lt;${email}&gt; has just started a 10th chat after starting 9 other chats in the last 24 hours. Maybe this user is spamming?</p>
<p>Their last message was:</p>

<blockquote style="font-style:italic;">
  <pre>
  ${lastMessage}
  </pre>
</blockquote>

<p>You can inspect their <a href="${dashboardUrl()}/action/inspect-chats?userId=${encodeURIComponent(email)}">full chat history</a>
or their <a href="${dashboardUrl()}/action/user-info?userId=${encodeURIComponent(email)}">user details</a> in the dashboard.</p>

<p>If this user keeps on sending a lot of messages, I will only notify you again in 72 hours</p>

<p>Yours truly,</p>

<p>WTMG Notifier</p>`
      }
    ]
  };

  if (!canSendMail()) {
    // @ts-ignore
    devSend(msg, 'spamAlertEmail');
    return Promise.resolve();
  }

  // @ts-ignore
  return send(msg);
};

/**
 *
 * @param {ChatNotificationEmailParams} params
 */
exports.sendChatBlockedEmail = ({ firstName, lastName, lastMessage, email }) => {
  const msg = {
    subject: `Warning: ${firstName} blocked because of 100 messages in the last 24 hours`,
    from: SUPPORT_FROM,
    to: [
      buildEmail('manon', WTMG_DOMAIN),
      buildEmail('dries', WTMG_DOMAIN),
      buildEmail('thor', WTMG_DOMAIN),
      buildEmail('support', WTMG_DOMAIN)
    ],
    categories: ['Chat blocked notification email'],
    content: [
      {
        type: 'text/html',
        value: `<p>Hello,</p>

<p>The user "${firstName} ${lastName}" &lt;${email}&gt; has just started a <strong>100th</strong> chat in the last 24 hours.</p>
<p>The system has <strong>automatically blocked them</strong> from starting more chats.</p>
<p>Their last message was:</p>

<blockquote style="font-style:italic;">
  <pre>
  ${lastMessage}
  </pre>
</blockquote>

<p>You can inspect their <a href="${dashboardUrl()}/action/inspect-chats?userId=${encodeURIComponent(email)}">full chat history</a>
or their <a href="${dashboardUrl()}/action/user-info?userId=${encodeURIComponent(email)}">user details</a> in the dashboard.</p>

<p><strong>In case we want to unblock this user, it has to be done manually in the database.</strong></p>

<p>Yours truly,</p>

<p>WTMG Notifier</p>`
      }
    ]
  };

  if (!canSendMail()) {
    // @ts-ignore
    devSend(msg, 'chatBlockedEmail');
    return Promise.resolve();
  }

  // @ts-ignore
  return send(msg);
};

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 */
exports.sendPhotoReminderEmail = (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-edf4a4e0455b4ffb85fb8f4704583f4b';
      break;
    case 'nl':
      templateId = 'd-8db6a5a30edd414d80074e653b3b56b7';
      break;
    default:
      templateId = 'd-b2b9a85c60c04534a97a643e64cba21d';
      break;
  }

  /**
   * @satisfies {SendGrid.MailDataRequired}
   */
  const msg = {
    to: email,
    from: SUPPORT_FROM,
    templateId,
    dynamicTemplateData: {
      firstName,
      first_name: firstName
    },
    categories: ['Photo reminder email']
  };

  if (!canSendMail()) {
    devSend(msg, 'photoReminderEmail');
    return Promise.resolve();
  }

  return send(msg);
};
