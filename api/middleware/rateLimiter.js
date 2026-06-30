const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');

let limiter;

const limits = {
  'GET /api/events': { points: 120, duration: 60 },
  'GET /api/events/:seq': { points: 300, duration: 60 },
  'GET /api/contracts/:id': { points: 300, duration: 60 },
  'POST /api/contracts': { points: 10, duration: 60 },
  'GET /api/wallet/:address': { points: 60, duration: 60 },
};

module.exports.initRateLimiter = (redisClient) => {
  if (redisClient) {
    limiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: 120,
      duration: 60,
      blockDurationSeconds: 0,
    });
    console.log('Rate limiter: Redis backed');
  } else {
    limiter = new RateLimiterMemory({
      points: 120,
      duration: 60,
    });
    console.warn('Rate limiter: In-memory fallback (Redis unavailable)');
  }
};

module.exports.rateLimitMiddleware = async (req, res, next) => {
  if (!limiter) {
    return next();
  }

  try {
    const key = `${req.ip}`;
    const result = await limiter.consume(key, 1);

    res.set('X-RateLimit-Limit', 120);
    res.set('X-RateLimit-Remaining', result.remainingPoints);
    res.set('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());

    next();
  } catch (err) {
    if (err.isFirstInDuration) {
      return res.status(429).set('Retry-After', String(err.msBeforeNext / 1000)).json({
        type: 'https://soroban-explorer.dev/errors/rate-limit',
        status: 429,
        title: 'Too Many Requests',
        detail: 'Rate limit exceeded',
      });
    }
    next(err);
  }
};
