/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */

const debug = require('debug')('rabbitmq-express:request');

class Request {
  constructor(app, rabbitMessage) {
    this.app = app;
    this.raw = {
      ...rabbitMessage,
    };
    const { content, fields, properties } = rabbitMessage;
    this.fields = fields;
    this.properties = properties;
    this.topic = fields.routingKey;
    this.path = fields.routingKey || '';
    this.value = content.toString();
    this.body = null;
    try {
      this.body = JSON.parse(content.toString());
    } catch (err) {
      debug('message.value is not a json body');
    }

    this.params = {};
    debug('Request created');
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = Request;
