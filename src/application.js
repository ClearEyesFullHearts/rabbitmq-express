/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */
const amqplib = require('amqplib');
const debug = require('debug')('rabbitmq-express:application');

const Queue = require('./queue');
const Request = require('./request');
const Response = require('./response');

class Application extends Queue {
  constructor(options) {
    super('.', {
      RouterClass: Queue,
      ...options,
    });

    this.conn = undefined;
    this.chan = undefined;
    this.consumerTag = undefined;

    this.topicToPattern = (topic) => {
      if (topic === '.') return '#';
      const elements = topic.split('.');

      if (elements.length === 1) {
        if (elements[0] === '' || elements[0] === '*' || elements[0] === '.') return '#';
        // change a named parameter to a star
        if (elements[0][0] === ':') return '*';
        return elements[0];
      }

      const paramToStar = [];
      for (let i = 0; i < elements.length; i += 1) {
        if (elements[i] === '*') {
          paramToStar.push('#');
        } else if (elements[i][0] === ':') {
          // change a named parameter to a star
          paramToStar.push('*');
        } else {
          paramToStar.push(elements[i]);
        }
      }

      const [firstword] = paramToStar;
      const pattern = [firstword];
      for (let j = 1; j < paramToStar.length; j += 1) {
        if ((paramToStar[j] === '*' || paramToStar[j] === '#')
          && (pattern[pattern.length - 1] === '*' || pattern[pattern.length - 1] === '#')) {
          pattern[pattern.length - 1] = '#';
        } else {
          pattern.push(paramToStar[j]);
        }
      }

      return pattern.join('.');
    };
  }

  get topics() {
    return this.getTopics();
  }

  get patterns() {
    const paths = this.getTopics();
    return paths.map((t) => this.topicToPattern(t));
  }

  async listen({
    rabbitURI, exchange = '', exchangeType = 'topic', queue = '', consumerOptions = {},
  }) {
    let exchangeName = exchange;
    let exchangeOptions = {
      durable: true,
      internal: false,
      autoDelete: false,
      alternateExchange: '',
      arguments: undefined,
    };
    if (Object.prototype.toString.call(exchange) !== '[object String]') {
      const { name, ...options } = exchange;
      exchangeName = name || '';
      exchangeOptions = {
        ...exchangeOptions,
        ...options,
      };
    }

    let queueName = queue;
    let queueOptions = {
      durable: true,
      exclusive: false,
      autoDelete: false,
      arguments: undefined,
    };
    if (Object.prototype.toString.call(queue) !== '[object String]') {
      const { name, ...options } = queue;
      queueName = name || '';
      queueOptions = {
        ...queueOptions,
        ...options,
      };
    }

    const consumerOpts = {
      consumerTag: '',
      noAck: false,
      exclusive: false,
      priority: 0,
      arguments: undefined,
      ...consumerOptions,
    };

    debug('Server connecting...');
    const connection = await amqplib.connect(rabbitURI);
    this.conn = connection;
    const channel = await connection.createChannel();
    this.chan = channel;

    const {
      exchange: actualExchangeName,
    } = await channel.assertExchange(exchangeName, exchangeType, exchangeOptions);
    const {
      queue: actualQueueName,
    } = await channel.assertQueue(queueName, queueOptions);

    const allPatterns = this.patterns;
    allPatterns.forEach((key) => {
      channel.bindQueue(actualQueueName, actualExchangeName, key);
    });

    const {
      consumerTag: actualConsumerTag,
    } = await channel.consume(actualQueueName, (msg) => {
      this.onMessage(channel, msg, !consumerOpts.noAck);
    }, consumerOpts);
    this.consumerTag = actualConsumerTag;
    debug(`Server connected to ${rabbitURI} with consumerTag: ${this.consumerTag}`);
  }

  onMessage(channel, msg, acknowledgement) {
    function getLastCall(res) {
      return (err) => {
        res.end(err);
      };
    }

    let req;
    let res;
    try {
      req = new Request(channel, msg, acknowledgement);
      res = new Response(req);
      req.res = res;

      this.handle(req, res, getLastCall(res));
    } catch (error) {
      if (res) {
        res.end(error);
      }
      throw error;
    }
  }

  async stop() {
    await this.chan.cancel(this.consumerTag);
    await this.chan.close();
    await this.conn.close();
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = Application;
