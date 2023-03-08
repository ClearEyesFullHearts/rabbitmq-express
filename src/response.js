/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */

class Response {
  constructor(req) {
    this.req = req;
  }

  end(err) {
    if (err) {
      this.req.errored();
      return;
    }

    this.req.end();
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = Response;
