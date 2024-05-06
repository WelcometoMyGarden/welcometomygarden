const fs = require('fs/promises');
const busboy = require('busboy');
const EmailReplyParser = require('email-reply-parser');
// https://github.com/haraka/node-address-rfc2822
const addrparser = require('address-rfc2822');
const { MAX_MESSAGE_LENGTH, sendMessageFromEmail } = require('../chat');

/**
 *
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {import('express').Request} req
 */
const parseInboundEmailInner = async (req) => {
  let envelopeFromEmail;
  let headerFrom;
  let dkimResult;

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
      const [host, result] = /@([^\s]+?)\s:\s(pass|fail)/.exec(val);
      dkimResult = {
        host,
        result
      };
    }
  });
  bb.on('close', () => {
    console.log('Done parsing form!');
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
    console.error('Not a POST');
    res.status('405').send('Method not allowed');
    return;
  }

  try {
    const { envelopeFromEmail, headerFrom, responseText, chatId, dkimResult } =
      await parseInboundEmailInner(req);

    console.log('envelope from: ', envelopeFromEmail);
    console.log('header from: ', headerFrom.address);
    console.log('dkim', dkimResult);
    console.log('response: ', responseText);
    console.log('chat ID: ', chatId);

    // Verify details
    //
    if (!chatId) {
      // TODO: Couldn't parse the chat ID. Send an error to the sender
      console.error("Couldn't parse the chat ID");
    }

    const headerFromEmail = headerFrom.address;
    //
    // Check DKIM: host must be verified, header host must match verified host
    const headerFromHost = headerFrom.host();
    if (dkimResult.result !== 'pass' || headerFromHost !== dkimResult.host) {
      console.error('DKIM verification error');
    }

    // Check max message content
    let message = responseText;
    if (responseText.length > MAX_MESSAGE_LENGTH) {
      // TODO: inform that the message is truncated?
      message = responseText.substring(0, MAX_MESSAGE_LENGTH);
    }

    // Send message
    await sendMessageFromEmail({
      chatId,
      message,
      fromEmail: headerFromEmail
    });
  } catch (e) {
    console.error(e);
  }

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
