const { logger } = require('firebase-functions/v2');
const { default: fetch } = require('node-fetch');
const { sentryHost } = require('./sharedConfig');

/**
 * See https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.errorLogTunnel = async (req, res) => {
  const SENTRY_HOST = sentryHost.value();
  if (req.method !== 'POST') {
    res.sendStatus(400);
    logger.warn('Non-POST request sent to the error log tunnel');
    return;
  }
  try {
    const envelope = req.body;
    const firstLine = envelope.split('\n')[0];
    const header = JSON.parse(firstLine);
    const dsn = new URL(header['dsn']);
    const project_id = dsn.pathname?.replace('/', '');

    if (dsn.hostname !== SENTRY_HOST) {
      throw new Error(`Invalid sentry hostname: ${dsn.hostname}`);
    }

    const upstream_sentry_url = `https://${SENTRY_HOST}/api/${project_id}/envelope/`;
    await fetch(upstream_sentry_url, {
      method: 'POST',
      body: envelope,
      headers: {
        'Content-Type': 'application/x-sentry-envelope'
      }
    });
    res.send({});
  } catch (e) {
    logger.error('Error tunneling to Sentry', e);
    res.sendStatus(500);
  }
};
