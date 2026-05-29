const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

async function attachRedisAdapter(io, redisUrl = process.env.REDIS_URL) {
  if (!redisUrl) {
    return null;
  }

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    console.error('Redis pub client error:', err);
  });

  subClient.on('error', (err) => {
    console.error('Redis sub client error:', err);
  });

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  console.log('✅ Socket.IO Redis adapter connected');

  return {
    async close() {
      await Promise.allSettled([
        pubClient.quit(),
        subClient.quit(),
      ]);
    },
  };
}

module.exports = {
  attachRedisAdapter,
};
