const PROJECT_NAME = 'demo-test';

exports.PROJECT_NAME = PROJECT_NAME;

// eslint-disable-next-line no-unused-vars
const logger = (_) => () => {};
exports.logger = logger;
exports.loggerStub = { error: logger('error'), log: logger('log') };

exports.clearAuth = async function () {
  const deleteURL = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_NAME}/accounts`;
  return fetch(deleteURL, { method: 'DELETE' });
};

exports.clearFirestore = async function () {
  const deleteURL = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_NAME}/databases/(default)/documents`;
  return fetch(deleteURL, { method: 'DELETE' });
};
