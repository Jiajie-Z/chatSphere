const DEFAULT_WINDOW_MS = 1000 * 60;
const DEFAULT_MAX_ATTEMPTS = 10;

function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  keyGenerator = (req) => `${req.ip}:${req.path}`,
  now = () => Date.now(),
} = {}) {
  const attemptsByKey = new Map();

  return function rateLimit(req, res, next) {
    const key = keyGenerator(req);
    const currentTime = now();
    const existingAttempt = attemptsByKey.get(key);

    if (!existingAttempt || existingAttempt.resetAt <= currentTime) {
      attemptsByKey.set(key, {
        count: 1,
        resetAt: currentTime + windowMs,
      });
      next();
      return;
    }

    if (existingAttempt.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((existingAttempt.resetAt - currentTime) / 1000);

      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: 'rate-limited' });
      return;
    }

    existingAttempt.count += 1;
    next();
  };
}

module.exports = {
  createRateLimiter,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_WINDOW_MS,
};
