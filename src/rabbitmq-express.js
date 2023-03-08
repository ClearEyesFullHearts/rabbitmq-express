/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */

const Application = require('./application');
const Queue = require('./queue');

function createApplication() {
  const app = new Application();

  return app;
}

/**
 * Expose the prototypes.
 */
module.exports = () => createApplication();
module.exports.Queue = Queue;
module.exports.Application = Application;
