# rabbitmq-express
simple rabbitmq listener in the style of an express app
### "rabbitmq listener"  
Start a server that consumes messages from a rabbitmq server, listening to one or more topics coming from one queue, powered by [amqplib](https://www.npmjs.com/package/amqplib).  
  
### "in the style of Express.js"  
Defines the topics you want to listen to as express routes and add middlewares to them, just like you would to an express server.  
It uses [middlewary](https://www.npmjs.com/package/middlewary)

# Usage
```javascript
const rabbitExpress = require('rabbitmq-express');

const server = rabbitExpress();

server.use((req, res, next) => {
  console.log('Shared middleware');
  next();
});

server.use('my-test-topic', (req, res, next) => {
  console.log('my-test-topic middleware');
  res.end();
});

server.use('another-test-topic', (req, res, next) => {
  console.log('another-test-topic first middleware');
  next();
}, (req, res, next) => {
  console.log('another-test-topic second middleware');
  res.end();
});

server.use('test.topic.*', (req, res, next) => {
  console.log('all topics that start by test.topic middleware');
  res.end();
});

server.use((err, req, res, next) => {
  console.log('Global error middleware');
  next();
});

server.listen({
  rabbitURI: 'amqp://myuser:mypassword@localhost:5672',
  exchange: 'myexchange',
  queue: 'myqueue',
  consumerOptions: { noAck: true },
});
```
  
If you are unfamiliar with how express middlewares work, I would suggest you read the [Express doc](https://expressjs.com/en/guide/using-middleware.html), here is just a reminder that you need to call either "next()" or "res.end()" in each of your middleware.  
  
## Differences
For obvious reasons the request and reponse objects you receive in your middlewares are different than for a HTTP request:  
```
const {
  raw, // raw rabbitmq message (rabbit message)
  rabbitChannel, // The amqplib channel object in case you to need to interact with it in your handlers (channel object)
  acknowledge, // flag to trigger the message acknowledgement at the end of the cycle, coming from the consumer options (boolean)
  properties, // message properties if present (object)
  fields, // message fields if present (object)
  topic, // name of the topic (routing key) sending the message (string)
  path, // name of the topic (routing key) sending the message (string)
  value, // message content (string)
  body, // message content converted to JSON if possible (object)
  params, // converted params from the topic name if present (object)
  res, // the response object
  next, // the next callback
} = req;

const {
  end(), // function to call to end the request-response cycle
} = res;
```
The request object is an event dispatcher and emits the 'close' event when the request cycle ends.  
  
The "Topic" object replaces the Router object. Note that you can mount a topic to another topic to create chained topics but only those that have a mounted middleware will be subscribed to the rabbit exchange.  
```javascript
const rabbitExpress = require('rabbitmq-express');

const { Topic } = rabbitExpress;

const server = rabbitExpress();

const testTopic = new Topic('test');
const outTopic = new Topic(':myparam');
const noMiddlewareTopic = new Topic('no');

testTopic.use((req, res) => {
  console.log('hello test');
  next();
});
outTopic.use((req, res) => {
  console.log('hello out', req.params.myparam);
  res.end();
});

outTopic.use(noMiddlewareTopic);
testTopic.use(outTopic);

server.use(testTopic);

// defined topics here are ['test', 'test.:myparam']
console.log(server.topics);
// defined patterns here are ['test', 'test.*']
console.log(server.patterns);
```
  
You can subscribe to topics using a Regexp and including parameters (i.e 'topic.name.:param'), these parameters will be added to the request object.  
Note that the routing on the rabbit server side is dependent on the type of exchange used.  
The "patterns" property of the application is a translation of the middleware paths to the amqp pattern used when subscribing to "topic" exchanges.  
The "topics" property of the application are the middleware paths, it is used when subscribing to "direct" exchanges since the routing is done on exact match.  
  
## server.listen
The `listen` function is called with a configuration object that can declare 5 properties:  
```javascript
{
  rabbitURI,
  exchange,
  exchangeType,
  queue,
  consumerOptions
}
```
### `rabbitURI`
this field is mandatory.  
It is either an amqp URI in string format or an amqplib (opened) connection object, in case you want to share a connection between rabbitmq-express servers.  
### `exchange`
This field is optional.  
It is either the name of an exchange in string format or an [exchange options object](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertExchange) with a name added, here are the default values:  
```javascript
{
  name: '',
  durable: true,
  internal: false,
  autoDelete: false,
  alternateExchange: undefined,
  arguments: undefined,
}
```
All fields are optional.  
If there is no name for the exchange the server will use rabbitmq default exchange.  
### `exchangeType`
This field is optional.  
One of the 4 type of exchange in string format (i.e. 'fanout', 'direct', 'topic', 'header').  
It defaults to 'topic'.  
### `queue`
This field is optional.  
It is either the name of queue in string format or a [queue options object](https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue) with a name added, here are the default values:  
```javascript
{
  name: '',
  durable: true,
  exclusive: false,
  autoDelete: false,
  arguments: undefined,
}
```
All fields are optional.  
If there is no name for the queue the server will assign a new one.  
### `consumerOptions`
This field is optional.  
A [consumer options object](https://amqp-node.github.io/amqplib/channel_api.html#channel_consume) here are the default values:  
```javascript
{
  consumerTag: '',
  noAck: false,
  exclusive: false,
  priority: 0,
  arguments: undefined,
}
```
All fields are optional.  
Note that `noAck` value is used by the request to automatically send, or not, the acknowledgement at the end of the cycle.  
