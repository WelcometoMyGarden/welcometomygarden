const assert = require('node:assert');
const PROJECT_NAME = 'demo-test';
const { setTimeout } = require('node:timers/promises');

exports.PROJECT_NAME = PROJECT_NAME;

/**
 * Provides some degree of diacritics removal
 * Does not fully normalize to ASCII (check lodash deburr?)
 * @param {string} s
 * @returns
 */
exports.normalize = (s) =>
  s
    .normalize('NFKD')
    // biome-ignore lint/suspicious/noMisleadingCharacterClass: <explanation>
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

// eslint-disable-next-line no-console
const logger = (type) => (msg) => console.log(`${type}: ${msg}`);
exports.logger = logger;
exports.loggerStub = {
  error: logger('error'),
  log: logger('log'),
  info: logger('info'),
  debug: logger('debug')
};

exports.clearAuth = async function () {
  const deleteURL = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_NAME}/accounts`;
  return fetch(deleteURL, { method: 'DELETE' });
};

exports.clearFirestore = async function () {
  const deleteURL = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_NAME}/databases/(default)/documents`;
  return fetch(deleteURL, { method: 'DELETE' });
};

// Emails

exports.clearEmails = async function () {
  return await fetch(`${process.env.LOCAL_EMAIL_HOST}/api/v1/messages`, {
    method: 'DELETE',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: '{}'
  });
};

/**
 * @param {string} queryString
 */
exports.clearEmailsByQuery = async function (queryString) {
  return await fetch(`${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=${queryString}`, {
    method: 'DELETE'
  });
};

/**
 * @param {string} queryString
 * @param {number} [timeout]
 */
exports.hasExactlyOneEmailWithQuery = async function (queryString, timeout = 20000) {
  console.log(`Checking for a single ${queryString} email`);
  const check = async () => {
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=${queryString}`
    ).then((r) => r.json());

    assert(Array.isArray(messages) && messages.length === 1, `${queryString} email not found`);
  };

  if (!timeout) {
    return await check();
  } else {
    let timeLeft = timeout;
    while (timeLeft > 0) {
      try {
        // no error = assertion succeeded
        return await check();
      } catch (e) {
        // error = assertion failed, wait 1 sec, then retry
        await setTimeout(1000);
        timeLeft -= 1000;
      }
    }
    // Last try
    await check();
  }
};

/**
 * See https://mailpit.axllent.org/docs/api-v1/view.html#get-/api/v1/messages
 */
exports.getEmails = async function () {
  const { messages } = await fetch(`${process.env.LOCAL_EMAIL_HOST}/api/v1/messages`).then((r) =>
    r.json()
  );
  return messages;
};
