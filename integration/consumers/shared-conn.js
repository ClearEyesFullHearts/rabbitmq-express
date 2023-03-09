const amqplib = require('amqplib');
const express = require('../../src/rabbitmq-express');

const sharedConnection = await amqplib.connect('amqp://myuser:mypassword@localhost:5672');

const queues = {};
const server = express();

server.use('plus.:exchange.:queue', (req, res) => {
  const { params: { exchange, queue } } = req;
  const worker = express();

  if (queues[`${exchange}:${queue}`] && queues[`${exchange}:${queue}`].length) {
    queues[`${exchange}:${queue}`].push(worker);
  } else {
    queues[`${exchange}:${queue}`] = [worker];
  }

  const l = queues[`${exchange}:${queue}`];

  worker.use('work', (req, res, next) => {
    console.log(`server number ${l + 1} listens to all messages from exchange ${exchange} and queue ${queue}`);
    next();
  });
  worker.listen({
    rabbitURI: sharedConnection,
    exchange: { name: exchange, durable: false },
    queue: { name: queue, exclusive: true },
  });
  res.end();
});

server.use('minus.:exchange.:queue', async (req, res) => {
  const { params: { exchange, queue } } = req;
  if (queues[`${exchange}:${queue}`] && queues[`${exchange}:${queue}`].length > 0) {
    const removedWorker = queues[`${exchange}:${queue}`].shift();
    await removedWorker.stop(false);
  }

  res.end();
});

server.listen({
  rabbitURI: sharedConnection,
  exchange: { name: 'admin', durable: false },
  queue: { name: 'management', exclusive: true },
});
