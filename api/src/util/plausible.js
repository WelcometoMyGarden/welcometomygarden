const { logger } = require('firebase-functions');
const { default: fetch } = require('node-fetch');

/**
 * https://plausible.io/docs/events-api
 * @param {string} name
 * @param {{url?: string, domain?: string, senderIP?: string}} opts
 */
exports.sendPlausibleEvent = async (name, opts = {}) => {
  const defaults = {
    url: 'backend://firebase-functions/parseInboundEmail?utm_source=firebase-functions&utm_medium=email',
    domain: 'welcometomygarden.org'
  };

  const { senderIP, ...rest } = opts;
  let senderHeaders = {};
  if (senderIP) {
    senderHeaders = { 'X-Forwarded-For': senderIP };
  }

  try {
    await fetch('https://visitors.slowby.travel/api/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'firebase-functions',
        ...senderHeaders
      },
      body: JSON.stringify({
        name,
        ...defaults,
        ...rest
      })
    });
  } catch (e) {
    logger.warn(`Sending Plausible event ${name} failed`);
  }
};
