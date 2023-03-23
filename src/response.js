/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */

const { EventEmitter } = require('events');
const debug = require('debug')('rabbitmq-express:response');

class Response extends EventEmitter {
  constructor(req, rabbitChannel, acknowledgement) {
    super();
    this.req = req;
    this.app = req.app;
    this.rabbitChannel = rabbitChannel;
    this.acknowledge = acknowledgement;
    this.statusCode = 200;
    this.isEnded = false;
    debug('Response created');
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  end(err) {
    debug(`end of response with ${err}`);
    if (this.isEnded) throw new Error('Response has already ended');
    this.isEnded = true;
    if (err) {
      debug('Response ended in error');
      this.statusCode = 500;
      if (this.acknowledge) this.rabbitChannel.nack(this.req.raw, false, true);
      this.emit('finish', err, this);
      return;
    }

    debug('Response ended');
    if (this.acknowledge) this.rabbitChannel.ack(this.req.raw, false);
    this.emit('finish', this);
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = Response;
