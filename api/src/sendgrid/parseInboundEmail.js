const { logger } = require('firebase-functions');
const fs = require('fs/promises');
const busboy = require('busboy');
const EmailReplyParser = require('email-reply-parser');

// https://github.com/haraka/node-address-rfc2822
const addrparser = require('address-rfc2822');
const { htmlToText } = require('html-to-text');
const { MAX_MESSAGE_LENGTH, sendMessageFromEmail } = require('../chat');
const { sendEmailReplyError } = require('../mail');
const { auth, db } = require('../firebase');
const { sendPlausibleEvent } = require('../util/plausible');

// Our sample email is 12 094 chars long, so 30K should be reasonable.
const MAX_EMAIL_LENGTH_CHARS = 30000;

/**
 *
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {FV2.Request} req
 * @returns {SendGrid.UnpackedInboundRequest}
 */
const unpackInboundEmailRequest = (req) => {
  const keysToUnpack = ['text', 'html', 'envelope', 'from', 'dkim', 'sender_ip'];
  /**
   * @type {SendGrid.UnpackedInboundRequest}
   */
  const response = {};
  // Parse email text
  const bb = busboy({ headers: req.headers });
  bb.on('field', (name, val) => {
    try {
      if (keysToUnpack.includes(name)) {
        response[name] = val;
      }
    } catch (e) {
      logger.warn(`Error unpacking field ${name} with value "${val}"`, e);
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

  return response;
};

/**
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {SendGrid.UnpackedInboundRequest} unpackedInboundRequest
 * @returns {SendGrid.ParsedInboundRequest}
 */
exports.parseUnpackedInboundEmail = (unpackedInboundRequest) => {
  const {
    text: emailPlainText,
    html,
    envelope,
    from,
    dkim,
    sender_ip: senderIP
  } = unpackedInboundRequest;

  if (emailPlainText) {
    logger.debug('Email plain text part:\n', emailPlainText);
  }
  if (html) {
    logger.debug('Email HTML part:\n', html);
  }

  // Parse email
  let envelopeFromEmail;
  /**
   * @type {addrparser.Address | undefined}
   */
  let headerFrom;
  /**
   * @type {SendGrid.ParsedInboundRequest['dkimResult']}
   */
  let dkimResult = {};

  // Pre-parse metadata
  try {
    if (envelope) {
      envelopeFromEmail = JSON.parse(envelope).from;
    }
    if (from) {
      [headerFrom] = addrparser.parse(from) || [];
    }
    if (dkim) {
      // This format isn't really documented, so we can't know how multiple signatures will appear... Example observed values are (on each line):
      // {@gmail.com : pass}
      // {@HOTMAIL.BE : pass}
      // none
      //
      if (dkim.trim() === 'none') {
        dkimResult = {};
      } else {
        // TODO: this will only support one DKIM signature, since the regex doesn't iterate. There might be multiple.
        const [, host, result] = /@([^\s]+?)\s:\s(pass|fail)/.exec(dkim) || [];
        dkimResult = {
          host: host.toLowerCase(),
          result
        };
      }
    }
  } catch (e) {
    logger.error('Error while parsing email values', e);
  }

  let responsePlainText;
  let quotedPlainText;

  // Attempt to parse the response text and Chat ID from the email
  let chatId;
  function parsePlainTextEmail(text) {
    // Poor man's ReDOS protection without setting up native re2 binaries, limit max email length.
    // https://github.com/crisp-oss/email-reply-parser/issues/39
    if (text.length > MAX_EMAIL_LENGTH_CHARS) {
      const warning = `Inbound email length exceeded (${MAX_EMAIL_LENGTH_CHARS.toLocaleString('nl-BE')} chars)`;
      logger.warn(warning);
      throw new Error(warning);
    }
    const parsedEmail = new EmailReplyParser.default().read(text);
    // Trim is not done automatically
    return [parsedEmail.getVisibleText().trim(), parsedEmail.getQuotedText()];
  }
  try {
    if (html) {
      // First try converting HTML to plain text. This has proven to result in more sensible/readable/separated
      // spacing and newlines between paragraphs compared to the "native" text/plain given by mail agents/clients,
      // which also makes it more compatible with email-reply-parser.
      // Example: native plain text tends to combine different quote header parts onto one line;
      // like "--- Original message ---From abc <abc@abc.org> ..."
      // which results in email-reply-parser detecting neither of the parts, which it would have detected if separated.
      const convertedPlainText = htmlToText(html, {
        wordwrap: null,
        // Include &nbsp; \u00a0 in whitespace chars, so it gets converted to normal space. i
        // It may appear in /Gmail 'écrit :'. The RE2's \s matcher in email-reply-parser
        // doesn't match an un-normalized &nbsp; otherwise.
        // Alternative fix would be a replace-all in email-reply-parser.
        whitespaceCharacters: ' \t\r\n\f\u200b\u00a0'
      });
      [responsePlainText, quotedPlainText] = parsePlainTextEmail(convertedPlainText);
    } else if (emailPlainText?.trim()) {
      logger.debug('No HTML text, parsing plain text directly');
      [responsePlainText, quotedPlainText] = parsePlainTextEmail(emailPlainText);
    }
    // Find the chat ID from the quoted text
    //
    // This regex assumes a delimiter like > ] or " at the end
    // > is used in Gmail plain text parts
    // ] is used in html-to-text
    // " is used in html
    const chatIdRegex = /\/chat\/.+?\/([a-zA-Z0-9]+)/;
    let chatRegexResult;
    const possibleSources = [
      ['parsed quoted', quotedPlainText],
      ['full plain text', emailPlainText],
      ['full html text', html]
    ];

    // Try to parse the chat ID
    for (let i = 0; i < possibleSources.length; i += 1) {
      const [currentSourceDescription, currentSource] = possibleSources[i];
      if (typeof currentSource === 'string') {
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
DKIM: ${JSON.stringify(dkimResult)} (raw: ${dkim})
Response text: ${responsePlainText}
Chat ID: ${chatId}
Sender IP: ${senderIP}`);

  return {
    envelopeFromEmail,
    headerFrom,
    responseText: responsePlainText,
    chatId,
    dkimResult,
    senderIP,
    html
  };
};

/**
 *
 * See https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 * We use the non-raw webhook.
 * @param {FV2.Request} req
 * @param {import('express').Response} res
 */
exports.parseInboundEmail = async (req, res) => {
  if (req.method !== 'POST') {
    logger.log('Not a POST');
    res.status(405).send('Method not allowed');
    return;
  }

  /**
   * @type {ReturnType<typeof exports.parseUnpackedInboundEmail>}
   */
  let parsedEmail = { dkimResult: {} };
  try {
    try {
      parsedEmail = this.parseUnpackedInboundEmail(unpackInboundEmailRequest(req));
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
    // Lowercase normalized for reliable matching with `dkimResult.host`
    const headerFromHost = headerFrom.host()?.toLowerCase();
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
    if (e instanceof Error && e.message === 'no-valid-user-found') {
      logger.warn(
        'No valid user found to send a message from based on this email reply, for more details, see previous log entries'
      );
    } else if (e instanceof Error) {
      logger.error(e.message);
    } else {
      logger.error('Unknown email error:', e);
    }

    // Send a response if possible
    const fromEmail =
      parsedEmail && (parsedEmail.headerFrom?.address || parsedEmail.envelopeFromEmail);

    if (fromEmail) {
      // TODO: this code is likely reused elsewhere too...
      let language = null;
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
 * @param {FV2.Request} req
 * @param {import('express').Response} res
 */
exports.dumpInboundEmail = async (req, res) => {
  await fs.writeFile('./last_email.txt', req.body);
  res.send('ok!');
};
