const { logger } = require('firebase-functions');
const fs = require('fs/promises');
const busboy = require('busboy');
const EmailReplyParser = require('email-reply-parser');

// https://github.com/haraka/node-address-rfc2822
const addrparser = require('address-rfc2822');
const { MAX_MESSAGE_LENGTH, sendMessageFromEmail } = require('../chat');
const { sendEmailReplyError } = require('../mail');
const { auth, db } = require('../firebase');
const { sendPlausibleEvent } = require('../util/plausible');

/**
 *
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {import('express').Request} req
 * @returns {Promise<{
 *  envelopeFromEmail?: string,
 *  headerFrom?: addrparser.Address,
 *  responseText?: string,
 *  chatId?: string,
 *  dkimResult: {
 *    host?: string,
 *    result?: string
 *  }
 *  senderIP?: string
 *  html?: string
 * }>}
 */
const parseInboundEmailInner = async (req) => {
  let envelopeFromEmail;
  /**
   * @type {addrparser.Address | undefined}
   */
  let headerFrom;
  let dkimRaw;
  let dkimResult = {};
  let senderIP;
  let html;

  // Plain-text email text
  let emailPlainText;

  // Parse email text
  const bb = busboy({ headers: req.headers });
  bb.on('field', (name, val) => {
    try {
      // Extract processed plain text
      if (name === 'text') {
        emailPlainText = val;
        logger.debug('Email plain text part: ', val);
      }
      if (name === 'html') {
        html = val;
        logger.debug('Email HTML part: ', val);
      }
      if (name === 'envelope') {
        envelopeFromEmail = JSON.parse(val).from;
      }
      if (name === 'from') {
        [headerFrom] = addrparser.parse(val) || [];
      }
      if (name === 'dkim') {
        // This format isn't really documented, so we can't know how multiple signatures will appear... Example observed values are (on each line):
        // {@gmail.com : pass}
        // none
        //
        dkimRaw = val;
        if (val.trim() === 'none') {
          dkimResult = {};
          return;
        }
        //
        // TODO: this will only support one DKIM signature, since the regex doesn't iterate. There might be multiple.
        const [, host, result] = /@([^\s]+?)\s:\s(pass|fail)/.exec(val) || [];
        dkimResult = {
          host,
          result
        };
      }
      if (name === 'sender_ip') {
        senderIP = val;
      }
    } catch (e) {
      logger.warn(`Error parsing field ${name} with value "${val}"`, e);
    }
  });

  bb.on('file', (name, info) => {
    // @ts-ignore
    const { filename, encoding, mimeType } = info;
    logger.warn(
      `Ignoring attached file: [${name}]: filename: %j, encoding: %j, mimeType: %j`,
      filename,
      encoding,
      mimeType
    );
  });

  // Firebase already reads the stream and saves it into a buffer, which we pass here
  // @ts-ignore this is provided by Firebase functions
  bb.end(req.rawBody);

  let responseText;

  // Attempt to parse the Chat ID from the email
  let chatId;
  try {
    if (emailPlainText) {
      const parsedEmail = new EmailReplyParser().read(emailPlainText);
      // Trim is not done automatically
      responseText = parsedEmail.getVisibleText().trim();
      const quotedText = parsedEmail.getQuotedText();
      // Find the chat ID from the quoted text
      const chatIdRegex = /\/chat\/.+?\/([a-zA-Z0-9]+)>/;
      let chatRegexResult;
      const possibleSources = [
        ['parsed quoted', quotedText],
        ['full plain text', emailPlainText],
        ['full html text', html]
      ];

      for (let i = 0; i < possibleSources.length; i += 1) {
        const [currentSourceDescription, currentSource] = possibleSources[i];
        chatRegexResult = chatIdRegex.exec(currentSource);
        if (chatRegexResult) {
          [, chatId] = chatRegexResult;
          logger.debug(`Found chat ID ${chatId} in ${currentSourceDescription}`);
          // Stop checking more sources
          break;
        } else {
          chatId = undefined;
        }
      }
    }
  } catch (e) {
    logger.warn('Error extracting response text from plain email text', e);
  }

  logger.log(`== Parsed email details ==
Envelope from: ${envelopeFromEmail}
Header from: ${headerFrom?.address}
DKIM: ${JSON.stringify(dkimResult)} (raw: ${dkimRaw})
Response text: ${responseText}
Chat ID: ${chatId}
Sender IP: ${senderIP}`);

  return { envelopeFromEmail, headerFrom, responseText, chatId, dkimResult, senderIP, html };
};

/**
 * @template T
 * @typedef {T extends Promise<infer U> ? U : T} Unpacked
 */

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
    res.status(405).send('Method not allowed');
    return;
  }

  /**
   * @type {Unpacked<ReturnType<typeof parseInboundEmailInner>>}
   */
  let parsedEmail = { dkimResult: {} };
  try {
    try {
      parsedEmail = await parseInboundEmailInner(req);
    } catch (parseError) {
      logger.error(parseError);
      throw new Error('Email error: unknown parsing error');
    }

    const { headerFrom, responseText, chatId, dkimResult, senderIP } = parsedEmail;

    // Verify details
    //
    if (!chatId) {
      // TODO: Couldn't parse the chat ID. Send an error to the sender
      throw new Error("Email error: couldn't parse the chat ID");
    }

    if (!headerFrom) {
      throw new Error("Email error: couldn't parse a valid header rfc2822.from email address");
    }

    const headerFromEmail = headerFrom.address;

    //
    // Check DKIM: host must be verified, header host must match verified host
    const headerFromHost = headerFrom.host();
    if (dkimResult.result !== 'pass' || headerFromHost !== dkimResult.host) {
      throw new Error('Email error: DKIM verification problem');
    }

    // Check & truncate max message content. Does not lead to an error.
    if (!responseText) {
      throw new Error("Email error: couldn't parse plain email text");
    }

    if (responseText.trim() === '') {
      throw new Error('Email error: reply text is empty');
    }

    let message = responseText;
    if (responseText.length > MAX_MESSAGE_LENGTH) {
      message = responseText.substring(0, MAX_MESSAGE_LENGTH);
      logger.warn(`Email length truncated from ${responseText.length}`);
    }

    // Send message
    await sendMessageFromEmail({
      chatId,
      message,
      fromEmail: headerFromEmail
    });
    logger.log('Reply email processed succesfully');
    // Note: sender IP is the email MTA sender IP, probably not the email client
    // But it might still be helpful to distinguish "visitors" somewhat in Plausible
    await sendPlausibleEvent('Send Email Reply', { senderIP });
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
        language = privateUserProfileData?.communicationLanguage;
      } catch (langFindError) {
        logger.warn(
          "Couldn't get the communicationLanguage for the user that (supposedly) replied",
          langFindError
        );
      }
      logger.log(`Sending error email to ${fromEmail} in language ${language}`);
      await sendEmailReplyError(fromEmail, language);
    } else {
      logger.warn("Couldn't parse an email to send an error message to, not sending error email");
    }
    await sendPlausibleEvent('Email Reply Error', { senderIP: parsedEmail?.senderIP });
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
