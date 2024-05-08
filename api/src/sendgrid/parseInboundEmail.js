const { logger } = require('firebase-functions');
const fs = require('fs/promises');
const busboy = require('busboy');
const EmailReplyParser = require('email-reply-parser');

// https://github.com/haraka/node-address-rfc2822
const addrparser = require('address-rfc2822');
const { MAX_MESSAGE_LENGTH, sendMessageFromEmail } = require('../chat');
const { sendEmailReplyError } = require('../mail');
const { auth, db } = require('../firebase');

/**
 *
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {import('express').Request} req
 */
const parseInboundEmailInner = async (req) => {
  let envelopeFromEmail;
  let headerFrom;
  let dkimResult = {};

  // Plain-text email text
  let emailPlainText;

  // Parse email text
  const bb = busboy({ headers: req.headers });
  bb.on('field', (name, val) => {
    // Extract processed plain text
    if (name === 'text') {
      emailPlainText = val;
    }
    if (name === 'envelope') {
      envelopeFromEmail = JSON.parse(val).from;
    }
    if (name === 'from') {
      [headerFrom] = addrparser.parse(val) || [];
    }
    if (name === 'dkim') {
      // This format isn't really documented, so we can't know how multiple signatures will appear...
      // TODO: this will only support one signature, since the regex doesn't iterate
      logger.log('Email DKIM field:', val);
      const [, host, result] = /@([^\s]+?)\s:\s(pass|fail)/.exec(val);
      dkimResult = {
        host,
        result
      };
    }
  });

  bb.on('file', (name, info) => {
    const { filename, encoding, mimeType } = info;
    logger.warn(
      `Ignoring attached file: [${name}]: filename: %j, encoding: %j, mimeType: %j`,
      filename,
      encoding,
      mimeType
    );
  });

  // Firebase already reads the stream and saves it into a buffer, which we pass here
  bb.end(req.rawBody);

  const parsedEmail = new EmailReplyParser().read(emailPlainText);
  // Trim is not done automatically
  const responseText = parsedEmail.getVisibleText().trim();
  const quotedText = parsedEmail.getQuotedText();

  // Find the chat ID from the quoted text
  const chatRegex = /\/chat\/.+?\/([a-zA-Z0-9]+)>/.exec(quotedText);
  const chatId = chatRegex ? chatRegex[1] : undefined;

  return { envelopeFromEmail, headerFrom, responseText, chatId, dkimResult };
};

/**
 *
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.parseInboundEmail = async (req, res) => {
  if (req.method !== 'POST') {
    logger.log('Not a POST');
    res.status('405').send('Method not allowed');
    return;
  }

  let parsedEmail = {};
  try {
    try {
      parsedEmail = await parseInboundEmailInner(req);
    } catch (parseError) {
      throw new Error('Email error: unknown parsing error');
    }

    const { envelopeFromEmail, headerFrom, responseText, chatId, dkimResult } = parsedEmail;
    logger.log(`== Parsed email details ==
Envelope from: ${envelopeFromEmail}
Header from: ${headerFrom.address}
DKIM: ${JSON.stringify(dkimResult)}
Response text: ${responseText}
Chat ID: ${chatId}`);

    // Verify details
    //
    if (!chatId) {
      // TODO: Couldn't parse the chat ID. Send an error to the sender
      throw new Error("Email error: couldn't parse the chat ID");
    }

    const headerFromEmail = headerFrom.address;
    //
    // Check DKIM: host must be verified, header host must match verified host
    const headerFromHost = headerFrom.host();
    if (dkimResult.result !== 'pass' || headerFromHost !== dkimResult.host) {
      throw new Error('Email error: DKIM verification problem');
    }

    // Check & truncate max message content. Does not lead to an error.
    let message = responseText;
    if (responseText.length > MAX_MESSAGE_LENGTH) {
      message = responseText.substring(0, MAX_MESSAGE_LENGTH);
      logger.warn(`Email length trucated from ${responseText.length}`);
    }

    // Send message
    await sendMessageFromEmail({
      chatId,
      message,
      fromEmail: headerFromEmail
    });
    logger.log('Reply email processed succcesfully');
  } catch (e) {
    // Log error
    if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error('Unknown email error:', e);
    }

    // Send a response if possible
    const fromEmail =
      parsedEmail && (parsedEmail.headerFrom?.address || parsedEmail.envelopeFromEmail);

    if (fromEmail) {
      // TODO: this code is likely reused elsewhere too...
      let language;
      try {
        const user = await auth.getUserByEmail(fromEmail);
        const privateUserProfileDocRef = db.doc(`users-private/${user.uid}`);
        const privateUserProfileData = (await privateUserProfileDocRef.get()).data();
        language = privateUserProfileData.communicationLanguage;
      } catch (langFindError) {
        logger.warn(
          "Couldn't get the communicationLanguage for the user that (supposedly) replied",
          langFindError
        );
      }
      await sendEmailReplyError(fromEmail, language);
    } else {
      logger.warn("Couldn't parse an email to send an error message to");
    }
  }

  // Always reply OK to SendGrid
  res.send('OK');
};

/**
 * Only for testing purposes
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.dumpInboundEmail = async (req, res) => {
  await fs.writeFile('./last_email.txt', req.body);
  res.send('ok!');
};
