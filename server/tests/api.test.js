const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const baseChats = require('../chats');
const { createApp, SESSION_COOKIE_MAX_AGE_MS } = require('../index');
const { createRateLimiter } = require('../rateLimit');

const SESSION_COOKIE_MAX_AGE_SECONDS = SESSION_COOKIE_MAX_AGE_MS / 1000;

function createTestServices(options = {}) {
  const sessionsById = new Map();
  const calls = {
    deletedSessions: [],
    loginAttempts: [],
    messageQueries: [],
    createdUsers: [],
  };

  const sessions = {
    async addSession(username) {
      const sid = `test-session-${username}`;
      sessionsById.set(sid, username);
      return sid;
    },
    async deleteSession(sid) {
      calls.deletedSessions.push(sid);
      sessionsById.delete(sid);
    },
    async getSessionUser(sid) {
      return sessionsById.get(sid) || '';
    },
  };

  const chats = {
    ...baseChats,
    async addMessage() {},
    async createUser(username) {
      calls.createdUsers.push(username);
    },
    async getMessages(query) {
      calls.messageQueries.push(query);
      return {
        hasMore: true,
        messagesList: [
          {
            id: 42,
            channel: query.channel || 'general',
            sender: 'jiajie',
            text: 'hello',
            created_at: '2026-05-28T00:00:00.000Z',
          },
        ],
      };
    },
    async getUserByUsername(username) {
      return username === 'taken' ? { username } : null;
    },
    async verifyLogin(username, password) {
      calls.loginAttempts.push({ username, password });

      if (username === 'missing') {
        return { ok: false, error: 'user-not-found' };
      }

      if (password !== 'secret1') {
        return { ok: false, error: 'invalid-credentials' };
      }

      return { ok: true };
    },
  };

  const { app } = createApp({ sessions, chats, ...options });

  return {
    app,
    calls,
    sessionsById,
  };
}

test('rejects protected API routes without a valid session', async () => {
  const { app } = createTestServices();

  const response = await request(app).get('/api/messages');

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { error: 'auth-missing' });
});

test('returns the current session user for a valid sid cookie', async () => {
  const { app, sessionsById } = createTestServices();
  sessionsById.set('sid-123', 'jiajie');

  const response = await request(app)
    .get('/api/session')
    .set('Cookie', ['sid=sid-123']);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { username: 'jiajie' });
});

test('passes message pagination query parameters to the data layer', async () => {
  const { app, calls, sessionsById } = createTestServices();
  sessionsById.set('sid-123', 'jiajie');

  const response = await request(app)
    .get('/api/messages?channel=engineering&before=42&limit=25')
    .set('Cookie', ['sid=sid-123']);

  assert.equal(response.status, 200);
  assert.deepEqual(calls.messageQueries, [{ before: '42', channel: 'engineering', limit: '25' }]);
  assert.equal(response.body.channel, 'engineering');
  assert.equal(response.body.hasMore, true);
  assert.equal(response.body.messagesList[0].id, 42);
});

test('returns the available chat channels', async () => {
  const { app, sessionsById } = createTestServices();
  sessionsById.set('sid-123', 'jiajie');

  const response = await request(app)
    .get('/api/channels')
    .set('Cookie', ['sid=sid-123']);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.channels.map((channel) => channel.id), [
    'general',
    'engineering',
    'random',
  ]);
});

test('clears and deletes an existing session on logout', async () => {
  const { app, calls, sessionsById } = createTestServices();
  sessionsById.set('sid-123', 'jiajie');

  const response = await request(app)
    .delete('/api/session')
    .set('Cookie', ['sid=sid-123']);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { wasLoggedIn: true });
  assert.deepEqual(calls.deletedSessions, ['sid-123']);
  const cookie = response.headers['set-cookie'][0];
  assert.equal(cookie.startsWith('sid=;'), true);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('returns a no-op logout response when no user is logged in', async () => {
  const { app, calls } = createTestServices();

  const response = await request(app).delete('/api/session');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { wasLoggedIn: false });
  assert.deepEqual(calls.deletedSessions, []);
});

test('registers a new user and sets an httpOnly session cookie', async () => {
  const { app, calls } = createTestServices();

  const response = await request(app)
    .post('/api/auth/register')
    .send({ username: 'jiajie', password: 'secret1' });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { username: 'jiajie' });
  assert.deepEqual(calls.createdUsers, ['jiajie']);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /sid=test-session-jiajie/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, new RegExp(`Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`));
  assert.doesNotMatch(cookie, /Secure/);
});

test('sets a secure session cookie when configured for production', async () => {
  const { app } = createTestServices({ secureSessionCookie: true });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jiajie', password: 'secret1' });

  assert.equal(response.status, 200);
  const cookie = response.headers['set-cookie'][0];
  assert.match(cookie, /sid=test-session-jiajie/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
});

test('rate limits repeated login attempts before auth work runs', async () => {
  let currentTime = 1000;
  const authRateLimiter = createRateLimiter({
    windowMs: 60_000,
    maxAttempts: 2,
    now: () => currentTime,
    keyGenerator: (req) => req.path,
  });
  const { app, calls } = createTestServices({ authRateLimiter });

  const firstResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jiajie', password: 'wrongpw' });
  const secondResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jiajie', password: 'wrongpw' });
  const thirdResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jiajie', password: 'wrongpw' });

  assert.equal(firstResponse.status, 401);
  assert.equal(secondResponse.status, 401);
  assert.equal(thirdResponse.status, 429);
  assert.deepEqual(thirdResponse.body, { error: 'rate-limited' });
  assert.equal(thirdResponse.headers['retry-after'], '60');
  assert.equal(calls.loginAttempts.length, 2);

  currentTime += 60_000;
  const resetResponse = await request(app)
    .post('/api/auth/login')
    .send({ username: 'jiajie', password: 'wrongpw' });

  assert.equal(resetResponse.status, 401);
  assert.equal(calls.loginAttempts.length, 3);
});
