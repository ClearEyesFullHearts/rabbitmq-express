const amqplib = require('amqplib');

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

    // make them work
    channel.publish('monitoring', 'work', Buffer.from('working'));

    // remove one parallelized worker to exchange monitoring
    channel.publish('admin', 'minus.monitoring.one', Buffer.from('remove one'));

    // make them work
    channel.publish('monitoring', 'work', Buffer.from('working'));

    // add one concurrent worker to exchange monitoring
    channel.publish('admin', 'plus.monitoring.two', Buffer.from('add one'));

    // make them work
    channel.publish('monitoring', 'work', Buffer.from('working'));
  }
}

Scenario.run();
