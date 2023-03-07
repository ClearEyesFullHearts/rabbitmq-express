const {
  describe, expect, test,
} = require('@jest/globals');

const Application = require('../src/application');
const Queue = require('../src/queue');

describe('Application tests', () => {
  test('Application can be instantiated', () => {
    const app = new Application();
    expect(app).toBeInstanceOf(Application);
    expect(app.route).toBe('.');
  });

  test.only('Application transform path to pattern', () => {
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
});
