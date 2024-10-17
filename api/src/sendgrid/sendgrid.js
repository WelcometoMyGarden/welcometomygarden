const sendgridClient = require('@sendgrid/client');
const sendgridMail = require('@sendgrid/mail');
const { sendgridMarketingKeyParam, sendgridSendKeyParam } = require('../sharedConfig');

// Key config happens in onInit
exports.sendgrid = sendgridClient;
/**
 * See https://github.com/sendgrid/sendgrid-nodejs/tree/main/packages/mail
 */
exports.sendgridMail = sendgridMail;

exports.initialize = function () {
  sendgridClient.setApiKey(sendgridMarketingKeyParam.value());
  const sendKey = sendgridSendKeyParam.value();
  if (sendKey) {
    sendgridMail.setApiKey(sendKey);
  }
};
