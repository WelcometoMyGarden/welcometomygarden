const functions = require('firebase-functions');

const sendgrid = require('@sendgrid/mail');

const API_KEY = functions.config().sendgrid.key;

const send = (msg) => sendgrid.send(msg).catch((err) => console.error(err));

sendgrid.setApiKey(API_KEY);

exports.sendAccountVerificationEmail = (email, name, verificationLink) => {
  const msg = {
    to: email,
    from: 'Welcome to My Garden <support@welcometomygarden.be>',
    templateId: 'd-9fa3c99cbc4e410ca2d51db0f5048276',
    dynamic_template_data: {
      firstName: name,
      verificationLink
    }
  };

  return send(msg);
};

exports.sendPasswordResetEmail = (email, name, resetLink) => {
  const msg = {
    to: email,
    from: 'Welcome to My Garden <support@welcometomygarden.be>',
    templateId: 'd-9fa3c99cbc4e410ca2d51db0f5048276',
    dynamic_template_data: {
      firstName: name,
      resetLink
    }
  };

  return send(msg);
};

exports.sendEmailChangeConfirmation = (email, name, confirmationLink) => {
  const msg = {
    to: email,
    from: 'Welcome to My Garden <support@welcometomygarden.be>',
    templateId: 'd-9fa3c99cbc4e410ca2d51db0f5048276',
    dynamic_template_data: {
      firstName: name,
      confirmationLink
    }
  };

  return send(msg);
};
