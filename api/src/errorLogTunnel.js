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
    // Example format of the envelope: line-delimited JSON, with 3 lines: header, type, data
    // {"event_id":"uuid","sent_at":"2025-07-25T13:29:25.768Z","sdk":{...details...},"dsn":"...","trace":{"environment":"Production","release":"...","public_key":"77f31f80871092134be4b99979c9720e","trace_id":"...","transaction":"/(static)/(home)","sampled":"true","sample_rand":"0.5892881306933779","sample_rate":"1"}}
    // {"type":"transaction"}
    // {"contexts": ... }
    const [headerJSON, ...envelopeRestJSONS] = envelope.split('\n');
    const header = JSON.parse(headerJSON);
    const dsn = new URL(header['dsn']);
    const project_id = dsn.pathname?.replace('/', '');

    if (dsn.hostname !== SENTRY_HOST) {
      throw new Error(`Invalid sentry hostname: ${dsn.hostname}`);
    }

    const upstream_sentry_url = `https://${SENTRY_HOST}/api/${project_id}/envelope/`;

    // See https://forum.sentry.io/t/real-client-ip-with-sentry-nextjs-tunnel/15438/2
    const forwardedEnvelope = [
      // New header line
      JSON.stringify({
        ...header,
        forwarded_for:
          typeof req.headers['x-forwarded-for'] === 'string'
            ? req.headers['x-forwarded-for']
            : req.socket.remoteAddress
      }),
      // Other two lines
      ...envelopeRestJSONS
    ].join('\n');

    await fetch(upstream_sentry_url, {
      method: 'POST',
      body: forwardedEnvelope,
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
