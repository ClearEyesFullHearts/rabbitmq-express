/*!
 * rabbitmq-express
 * Copyright(c) 2023 MFT
 * MIT Licensed
 */

/**
 * Module dependencies.
 * @private
 */

const { Router, Layer } = require('middlewary');

class Queue extends Router {
  constructor(...args) {
    const [topicName, opt] = args;
    let myOptions = opt;
    let myRoute;
    if (topicName && Object.prototype.toString.call(topicName) === '[object String]') {
      myRoute = topicName;
    } else {
      myOptions = topicName;
    }

    super({
      RouterClass: Queue,
      ...myOptions,
      delimiter: '.',
    });

    this.route = myRoute;
  }

  getTopics() {
    const mytopics = [];
    for (let i = 0; i < this.stack.length; i += 1) {
      if (this.stack[i] instanceof Queue) {
        mytopics.push(...this.stack[i].getTopics());
      } else if (this.stack[i] instanceof Layer) {
        if (this.stack[i].path && this.stack[i].path !== this.options.delimiter) {
          mytopics.push(this.stack[i].path);
        }
      }
    }
    return [...new Set(mytopics)];
  }
}

module.exports = Queue;
