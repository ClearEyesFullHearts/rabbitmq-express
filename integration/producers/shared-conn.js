const amqplib = require('amqplib');

const sleep = (seconds) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve();
  }, (seconds * 1000));
});

class Scenario {
  static async run() {
    const connection = await amqplib.connect('amqp://myuser:mypassword@localhost:5672');
    const channel = await connection.createChannel();
    await channel.assertExchange('admin', 'topic', {
      durable: false,
    });
    await channel.assertExchange('monitoring', 'topic', {
      durable: false,
    });

    // add one parallelized worker to exchange monitoring
    channel.publish('admin', 'plus.monitoring.one', Buffer.from('add one'));
    // add one parallelized worker to exchange monitoring
    channel.publish('admin', 'plus.monitoring.one', Buffer.from('add one'));
    // add one parallelized worker to exchange monitoring
    channel.publish('admin', 'plus.monitoring.one', Buffer.from('add one'));

    await sleep(5);

    // make them work
    for (let i = 0; i < 7; i += 1) {
      channel.publish('monitoring', 'work', Buffer.from('working'));
    }

    // remove one parallelized worker to exchange monitoring
    channel.publish('admin', 'minus.monitoring.one', Buffer.from('remove one'));

    await sleep(1);

    // make them work
    for (let i = 0; i < 7; i += 1) {
      channel.publish('monitoring', 'work', Buffer.from('working'));
    }

    // add one concurrent worker to exchange monitoring
    channel.publish('admin', 'plus.monitoring.two', Buffer.from('add one'));

    await sleep(1);

    // make them work
    for (let i = 0; i < 7; i += 1) {
      channel.publish('monitoring', 'work', Buffer.from('working'));
    }
  }
}

Scenario.run();
