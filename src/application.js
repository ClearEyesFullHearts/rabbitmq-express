/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */
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

  /*
  async listen(clientConfig, consumerConfig, fromBeginning = false) {
    const { clientId, brokers } = clientConfig;
    const { groupId } = consumerConfig;

    // minimum required config for kafka
    if (!clientId) throw new Error('clientId is mandatory in clientConfig');
    if (!brokers) throw new Error('brokers is mandatory in clientConfig');
    if (!groupId) throw new Error('groupId is mandatory in consumerConfig');
    const myTopics = this.topics;
    if (!myTopics || !myTopics.length || myTopics.length < 1) throw new Error('You need to subscribe to at least one topic');

    const kafka = new Kafka(clientConfig);

    this.consumer = kafka.consumer(consumerConfig);

    debug('Server connecting...');
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: myTopics, fromBeginning });

    await this.consumer.run({
      eachMessage: async (kafkaMessage) => {
        await this.onMessage(this.consumer, kafkaMessage);
      },
    });

    debug(`Server connected to ${brokers}`);
  }

  async onMessage(kafkaConsumer, kafkaMessage) {
    function getLastCall(res, reject) {
      return (err) => {
        if (err) {
          reject(err);
          return;
        }
        res.end();
      };
    }
    await new Promise((resolve, reject) => {
      try {
        const req = new Request(kafkaConsumer, kafkaMessage);
        const res = new Response(req, resolve);
        req.res = res;

        this.handle(req, res, getLastCall(res, reject));
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    await this.consumer.disconnect();
  }
  */
}

/**
 * Module exports.
 * @public
 */

module.exports = Application;
