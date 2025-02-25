const sinon = require('sinon');
// https://sinonjs.org/releases/v19/general-setup/
exports.mochaHooks = {
  afterEach() {
    sinon.restore();
  }
};
