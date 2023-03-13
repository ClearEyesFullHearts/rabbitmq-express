const {
  describe, expect, test,
} = require('@jest/globals');

const process = require('node:process');
const Application = require('../src/application');
const Topic = require('../src/topic');

describe('Application tests', () => {
  test('Application can be instantiated', () => {
    const app = new Application();
    expect(app).toBeInstanceOf(Application);
    expect(app.route).toBe('.');
  });

  test('Application transform path to pattern', () => {
    const app = new Application();
    expect(app.topicToPattern('')).toBe('#');
    expect(app.topicToPattern('.')).toBe('#');
    expect(app.topicToPattern('*')).toBe('#');
    expect(app.topicToPattern(':userId')).toBe('*');
    expect(app.topicToPattern(':userId.*')).toBe('#');
    expect(app.topicToPattern(':userId.:type')).toBe('#');
    expect(app.topicToPattern(':userId.type')).toBe('*.type');
    expect(app.topicToPattern('*.:userId')).toBe('#');
    expect(app.topicToPattern('*.:userId.*')).toBe('#');
    expect(app.topicToPattern('user.:userId')).toBe('user.*');
    expect(app.topicToPattern('*.type')).toBe('#.type');
    expect(app.topicToPattern('*.user.*')).toBe('#.user.#');
    expect(app.topicToPattern('topic')).toBe('topic');
    expect(app.topicToPattern('topic.test')).toBe('topic.test');
    expect(app.topicToPattern('topic.:type.test')).toBe('topic.*.test');
    expect(app.topicToPattern('topic.:type.:userId.test')).toBe('topic.#.test');
    expect(app.topicToPattern('topic.:type.test.:userId')).toBe('topic.*.test.*');
    expect(app.topicToPattern('topic.*.test')).toBe('topic.#.test');
    expect(app.topicToPattern('topic.*.:userId.test')).toBe('topic.#.test');
    expect(app.topicToPattern('topic.*.:userId.test.:type')).toBe('topic.#.test.*');
  });

  test.skip('Uncaught error should throw', (done) => { // can't be tested see https://github.com/facebook/jest/issues/5620
    const msg = {
      content: JSON.stringify({ foo: 'bar' }),
      fields: {
        routingKey: 'topic.user',
      },
      properties: {},
    };
    let ackCalled = false;
    let nackCalled = false;
    const channel = {
      ack: () => { ackCalled = true; },
      nack: () => { nackCalled = true; },
    };

    const app = new Application();
    const result = [];
    app.use((req, res, next) => {
      result.push('first');
      next();
    });

    app.use('topic.*', (req, res, next) => {
      result.push('second');
      next();
    });

    const testTopic = new Topic('topic');
    testTopic.use('user', (req, res, next) => {
      result.push('third');
      throw new Error('error from middleware');
    });

    app.use(testTopic);

    process.on('uncaughtException', (err) => {
      console.log('my uncaught exception');

      done();
    });

    app.onMessage(channel, msg, true);
  });
});
