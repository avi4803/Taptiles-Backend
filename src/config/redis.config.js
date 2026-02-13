const Redis = require('ioredis');

const redis = new Redis({
    host:process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    retryStrategy: (times) =>{
        const delay = Math.min(times * 50 , 2000);
        return delay;
    }

});


// Connection events
redis.on('connect', () => {
  console.log('✅ Redis connected');
});
redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});
redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});
module.exports = redis;