const { logger } = require('firebase-functions/v2');
const { default: fetch } = require('node-fetch');
const { sentryHost } = require('./sharedConfig');

/**
 * See https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 */
exports.errorLogTunnel = async (request, response) => {
  const SENTRY_HOST = sentryHost.value();
  try {
    const envelope = request.body;
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
    response.send({});
  } catch (e) {
    logger.error('Error tunneling to Sentry', e);
    response.sendStatus(500);
  }
};
