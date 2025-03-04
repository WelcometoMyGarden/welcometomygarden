const { logger } = require('firebase-functions');
const { default: fetch } = require('node-fetch');
const { projectID } = require('firebase-functions/params');

/**
 * https://plausible.io/docs/events-api
 * @param {string} name
 * @param {{url?: string, functionName?: string, domain?: string, senderIP?: string, props?: Record<string,string>}} opts
 */
exports.sendPlausibleEvent = async (name, opts = {}) => {
  if (projectID.value() !== 'wtmg-production') {
    logger.debug(`Ignoring backend Plausible event in non-production environment: ${name}`);
    return;
  }

  const defaults = {
    url: 'backend://firebase-functions/parseInboundEmail?utm_source=firebase-functions&utm_medium=email',
    domain: 'welcometomygarden.org'
  };

  const { senderIP, functionName, url, ...rest } = opts;
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
        ...(functionName
          ? {
              url: `backend://firebase-functions/${functionName}?utm_source=firebase-functions`
            }
          : {}),
        ...(url ? { url } : {}),
        ...rest
      })
    });
  } catch (e) {
    logger.warn(`Sending Plausible event ${name} failed`);
  }
};
