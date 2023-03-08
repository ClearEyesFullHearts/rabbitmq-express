const express = require('../../src/rabbitmq-express');

const server = express();

function myguyShared(req, res, next) {
  console.log('Shared middleware', req);
  const start = Date.now();
  req.once('close', () => {
    console.log(`Request for ${req.topic} ended in ${Math.floor(Date.now() - start)} ms`);
  });
  next();
}

function myguy1(req, res) {
  console.log('hello topic 1', req.params);
  res.end();
}

function myguy3(req, res, next) {
  console.log('Error on topic 3');
  next(new Error());
}

function myguy2(nb) {
  return (req, res, next) => {
    console.log(`hello topic 2 ${nb}`);
    next();
  };
}
function myguy2Errored(req, res, next) {
  console.log('Error on topic 2');
  next(new Error());
}
function myguy2HandleError(err, req, res, next) {
  console.log('Topic 2 error middleware');
  next(err);
}

function myguyErrored(err, req, res, next) {
  console.log('Shared error middleware');
  next();
}

server.use(myguyShared);

server.use('test.*.:id', myguy1);
server.use('test-topic-3', myguy3);
server.use('test-topic-2', myguy2('a'), myguy2('b'), myguy2('c'), myguy2Errored, myguy2('ignored'), myguy2HandleError);

const outTopic = new express.Queue('test-topic-4');
outTopic.use((req, res) => {
  console.log('hello topic 4', req);
  res.end();
});
server.use(outTopic);

server.use(myguyErrored);

const rabbitURI = 'amqp://myuser:mypassword@localhost:5672';

server.listen({
  rabbitURI, exchange: 'test.exchange', queue: 'myqueue', consumerOptions: { noAck: true },
});

process.on('SIGINT', async () => {
  await server.stop();
});
