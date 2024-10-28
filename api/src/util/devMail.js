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
    // eslint-disable-next-line prefer-const
    address = first?.address;
    name = first?.name();
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
 * Only supports a single to/from address for now
 * See https://mailpit.axllent.org/docs/api-v1/view.html#post-/api/v1/send
 * @param {SendGrid.MailDataRequired} msg
 * @param {string} emailTitle
 * @returns {Promise<[import('@sendgrid/mail').ClientResponse, {}]>}
 */
module.exports = async function send({ to, from, dynamicTemplateData, templateId }, emailTitle) {
  const localEmailServerUrl = localEmailHostParam.value();
  if (!localEmailServerUrl) {
    console.warn('No local mailpit server configured');
    return [{ statusCode: 999, body: {}, headers: {} }, {}];
  }
  const toMail = parseEmailSpec(to);
  const request = {
    To: [toMail],
    From: parseEmailSpec(from),
    // These would usually come from the dynamic template ID
    Subject: `${emailTitle} to ${toMail.Email}`,
    Text: JSON.stringify(
      {
        templateId,
        dynamicTemplateData
      },
      null,
      2
    )
  };
  console.log('Sending local email', localEmailServerUrl, JSON.stringify(request));
  const response = await fetch(`${localEmailServerUrl}/api/v1/send`, {
    method: 'POST',
    body: JSON.stringify(request)
  });

  const body = await response.json();

  return [{ statusCode: response.status, body, headers: response.headers }, body];
};
