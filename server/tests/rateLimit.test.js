const assert = require('node:assert/strict');
const test = require('node:test');

const { createRateLimiter } = require('../rateLimit');

function createMockResponse() {
  return {
    body: null,
    headers: {},
    statusCode: null,
    json(body) {
      this.body = body;
      return this;
    },
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
  };
}

test('limits requests by key until the window resets', () => {
  let currentTime = 1000;
  let nextCalls = 0;
  const rateLimit = createRateLimiter({
    windowMs: 10_000,
    maxAttempts: 2,
    now: () => currentTime,
    keyGenerator: () => 'auth:login',
  });

  const firstResponse = createMockResponse();
  rateLimit({}, firstResponse, () => {
    nextCalls += 1;
  });

  const secondResponse = createMockResponse();
  rateLimit({}, secondResponse, () => {
    nextCalls += 1;
  });

  const thirdResponse = createMockResponse();
  rateLimit({}, thirdResponse, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 2);
  assert.equal(thirdResponse.statusCode, 429);
  assert.deepEqual(thirdResponse.body, { error: 'rate-limited' });
  assert.equal(thirdResponse.headers['Retry-After'], '10');

  currentTime += 10_000;
  const resetResponse = createMockResponse();
  rateLimit({}, resetResponse, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 3);
  assert.equal(resetResponse.statusCode, null);
});
