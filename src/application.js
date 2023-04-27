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

const Topic = require('./topic');
const Request = require('./request');
const Response = require('./response');

class Application extends Topic {
  constructor(options) {
    super('.', {
      RouterClass: Topic,
      ...options,
    });

    this.conn = undefined;
    this.chan = undefined;
    this.consumerTag = undefined;
    this.activeResponses = 0;

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
    let exchangeOptions;
    if (Object.prototype.toString.call(exchange) !== '[object String]') {
      const { name: nameEx, ...options } = exchange;
      if (!nameEx) throw new Error('We cannot change the options of the default exchange');
      exchangeName = nameEx || '';
      exchangeOptions = {
        durable: true,
        internal: false,
        autoDelete: false,
        // alternateExchange: undefined,
        // arguments: undefined,
        ...options,
      };
    }

    let queueName = queue;
    let queueOptions;
    if (Object.prototype.toString.call(queue) !== '[object String]') {
      const { name: nameQ, ...options } = queue;
      queueName = nameQ || '';
      queueOptions = {
        durable: true,
        exclusive: false,
        autoDelete: false,
        // arguments: undefined,
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

    // trying to bind an anonymous queue to the default exchange is pointless
    // since it can only be called by its name, so we forbid it.
    if (!exchangeName && !queueName) throw new Error('trying to bind an anonymous queue to the default exchange is pointless. You must define either an exchange or a queue');

    debug('Server connecting...');
    let connection = rabbitURI;
    if (Object.prototype.toString.call(rabbitURI) === '[object String]') {
      connection = await amqplib.connect(rabbitURI);
    }
    this.conn = connection;
    const channel = await connection.createChannel();
    this.chan = channel;

    // no need to assert the default exchange
    if (exchangeName !== '') {
      await channel.assertExchange(exchangeName, exchangeType, exchangeOptions);
    }
    debug('exchange asserted');

    const {
      queue: actualQueueName,
    } = await channel.assertQueue(queueName, queueOptions);
    debug('queue asserted');

    // We cannot bind topics to the default exchange, it only binds on the queue name
    // Which, admittedly, defeats a bit the purpose of this module
    // But I am not one to judge others.
    if (exchangeName !== '') {
      let allPatterns;
      switch (exchangeType) {
        // probably shouldn't use header exchange type
        // as it won't match the middlewares on anything.
        case 'header':
        case 'fanout':
          allPatterns = [''];
          break;
        case 'direct':
          allPatterns = this.topics;
          break;
        case 'topic':
        default:
          allPatterns = this.patterns;
          break;
      }
      allPatterns.forEach((key) => {
        channel.bindQueue(actualQueueName, exchangeName, key);
      });
    }
    debug('binding done');

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
        if (err) throw err;
      };
    }

    let req;
    let res;
    try {
      req = new Request(this, msg);
      res = new Response(req, channel, acknowledgement);
      this.activeResponses += 1;
      res.once('finish', () => { this.activeResponses -= 1; });

      const next = getLastCall(res);
      req.res = res;
      req.next = next;

      this.handle(req, res, next);
    } catch (error) {
      if (res) {
        res.end(error);
      }
      throw error;
    }
  }

  async stop(closeConnection = true, maxTry = 250) {
    function waitForLastResponse(me, counter, max) {
      if (me.activeResponses === 0) {
        debug('Last response ended, close channel');
        me.chan.close();
      } else {
        if (counter > max) {
          throw new Error('Server should be closed by now');
        }
        setTimeout(() => {
          const count = counter + 1;
          waitForLastResponse(me, count, max);
        }, 20);
      }
    }
    return new Promise((resolve) => {
      this.chan.cancel(this.consumerTag)
        .then(() => {
          debug('Channel canceled');
          this.chan.once('close', async () => {
            debug('Channel closed');
            if (closeConnection) {
              this.conn.close()
                .then(() => {
                  debug('Connection closed');
                  resolve();
                });
            } else {
              resolve();
            }
          });
          waitForLastResponse(this, 0, maxTry);
        });
    });
  }
}

/**
 * Module exports.
 * @public
 */

module.exports = Application;
