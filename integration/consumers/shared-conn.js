const amqplib = require('amqplib');
const express = require('../../src/rabbitmq-express');

const run = async () => {
  const sharedConnection = await amqplib.connect('amqp://myuser:mypassword@localhost:5672');

  const queues = {};
  const server = express();

  server.use((req, res, next) => {
    console.log(`Received "${req.value}" with routing ${req.path}`);
    next();
  });

  server.use('plus.:exchange.:queue', (req, res) => {
    const { params: { exchange, queue } } = req;
    const worker = express();

    if (queues[`${exchange}:${queue}`] && queues[`${exchange}:${queue}`].length) {
      queues[`${exchange}:${queue}`].push(worker);
    } else {
      queues[`${exchange}:${queue}`] = [worker];
    }

    worker.use('work', (wreq, wres) => {
      console.log(`server number ${worker.consumerTag} listens to work messages from exchange ${exchange} and queue ${queue}`);
      wres.end();
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
};

run();
