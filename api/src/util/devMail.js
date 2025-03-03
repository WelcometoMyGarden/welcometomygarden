const { default: fetch } = require('node-fetch');
const addrparser = require('address-rfc2822');
const { defineString } = require('firebase-functions/params');

const localEmailHostParam = defineString('LOCAL_EMAIL_HOST', { default: '' });

// Re-implement the SendGrid mail API for local development and testing
// using Mailpit
// https://mailpit.axllent.org/docs/api-v1/view.html#post-/api/v1/send

/**
 * @param {SendGrid.MailDataRequired['from'] | SendGrid.MailDataRequired['to']} email
 */
const parseEmailSpec = (email) => {
  let address;
  /**
   * @type {string | null}
   */
  let name = null;
  if (typeof email === 'string') {
    const [first] = addrparser.parse(email);

    address = first?.address;
    name = first?.name();
  } else if (
    email != null &&
    typeof email === 'object' &&
    (typeof email['email'] !== 'undefined' || typeof email['name'] !== 'undefined')
  ) {
    // Assume object form
    address = email['email'];
    name = email['name'];
  } else {
    console.warn('Email argument passed to devMail without parseable properties', email);
  }

  return {
    Email: address,
    ...(name
      ? {
          Name: name
        }
      : {})
  };
};

/**
 * Does not support personalizations for now
 * See https://mailpit.axllent.org/docs/api-v1/view.html#post-/api/v1/send
 * @param {SendGrid.MailDataRequired} msg
 * @param {string} emailTitle
 * @returns {Promise<[import('@sendgrid/mail').ClientResponse, {}]>}
 */
module.exports = async function send(msg, emailTitle) {
  const { to, from, dynamicTemplateData, templateId, content } = msg;
  const localEmailServerUrl = localEmailHostParam.value();
  if (!localEmailServerUrl) {
    console.warn('No local mailpit server configured');
    return [{ statusCode: 999, body: {}, headers: {} }, {}];
  }
  let msgText;
  let msgHtml;
  if (content) {
    msgText = content.find((c) => c.type === 'text/plain')?.value;
    msgHtml = content.find((c) => c.type === 'text/html')?.value;
  }
  let toAddresses;
  if (Array.isArray(to)) {
    toAddresses = to.map(parseEmailSpec);
  } else {
    toAddresses = [parseEmailSpec(to)];
  }
  const request = {
    To: toAddresses,
    From: parseEmailSpec(from),
    // These would usually come from the dynamic template ID
    Subject: `${emailTitle} to ${toAddresses.map((t) => t.Email).join(', ')}`,
    ...(msgHtml
      ? {
          HTML: msgHtml
        }
      : {}),
    Text:
      msgText ??
      JSON.stringify(
        {
          templateId,
          dynamicTemplateData
        },
        null,
        2
      )
  };
  console.log('Sending local email', localEmailServerUrl, JSON.stringify(request));
  try {
    const response = await fetch(`${localEmailServerUrl}/api/v1/send`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    const body = await response.json();

    /**
     * @type {[import('@sendgrid/mail').ClientResponse, {}]}
     */
    const result = [{ statusCode: response.status, body, headers: response.headers }, body];
    if (response.status < 200 || response.status >= 300) {
      console.warn('Something may have gone wrong while trying to send a dev email: ', body);
    }
    return result;
  } catch (e) {
    console.warn('Error while trying to send a dev env email, is mailpit running?');
    console.info(emailTitle, JSON.stringify(msg));
    return [{ statusCode: 500, body: null, headers: {} }, null];
  }
};
