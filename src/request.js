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
const debug = require('debug')('rabbitmq-express:request');

class Request extends EventEmitter {
  constructor(rabbitChannel, rabbitMessage, acknowledgement) {
    super();

    this.raw = {
      ...rabbitMessage,
    };
    const { content, fields, properties } = rabbitMessage;
    this.rabbitChannel = rabbitChannel;
    this.topic = fields.routingKey;
    this.path = fields.routingKey;
    this.properties = properties;
    this.value = content.toString();
    this.body = null;
    try {
      this.body = JSON.parse(content.toString());
    } catch (err) {
      debug('message.value is not a json body');
    }

    this.acknowledge = acknowledgement;

    this.params = {};

    this.isEnded = false;
    debug('Request created');
  }

  end() {
    if (this.isEnded) throw new Error('Request has already ended');

    this.isEnded = true;
    if (this.acknowledge) this.rabbitChannel.ack(this.raw, false);
    debug('Request ended');
    this.emit('close');
  }

  errored() {
    if (this.isEnded) throw new Error('Request has already ended');

    this.isEnded = true;
    if (this.acknowledge) this.rabbitChannel.nack(this.raw, false, true);
    debug('Request ended with error');
    this.emit('close');
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = Request;
