const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const defaultSessions = require('./sessions');
const defaultChats = require('./chats');
const auth = require('./auth');
const { createRateLimiter } = require('./rateLimit');
const { attachRedisAdapter } = require('./socketCluster');

const PORT = process.env.PORT || 3000;
const SESSION_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

function getSessionCookieOptions({ secure = process.env.NODE_ENV === 'production' } = {}) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  };
}

function getClearSessionCookieOptions({ secure = process.env.NODE_ENV === 'production' } = {}) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
  };
}

function createApp({
  sessions = defaultSessions,
  chats = defaultChats,
  authRateLimiter = createRateLimiter(),
  secureSessionCookie = process.env.NODE_ENV === 'production',
} = {}) {
  const app = express();

  app.use(cookieParser());
  app.use(express.static('./public'));
  app.use(express.json());

  async function getOnlineUsers(io) {
    const sockets = await io.fetchSockets();
    const sortedUsers = [
      ...new Set(
        sockets
          .map((socket) => socket.data.username)
          .filter(Boolean)
      ),
    ].sort();

    return sortedUsers.reduce((users, username) => {
      users[username] = username;
      return users;
    }, {});
  }

  async function broadcastUsers(io) {
    io.emit('users-updated', await getOnlineUsers(io));
  }

  async function broadcastMessages(io) {
    try {
      const { messagesList } = await chats.getMessages();
      io.emit('messages-updated', messagesList);
    } catch (err) {
      console.error('Failed to broadcast messages:', err);
    }
  }

  const getRequestSession = auth.createGetRequestSession(sessions);
  const requireAuth = auth.createRequireAuth(getRequestSession);
  const sessionCookieOptions = getSessionCookieOptions({ secure: secureSessionCookie });
  const clearSessionCookieOptions = getClearSessionCookieOptions({ secure: secureSessionCookie });

  app.get('/api/session', requireAuth, async (req, res) => {
    const { username } = req.session;
    res.json({ username });
  });

  app.post('/api/auth/register', authRateLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!chats.isValidUsername(username)) {
      res.status(400).json({ error: 'invalid-username' });
      return;
    }

    if (!chats.isValidPassword(password)) {
      res.status(400).json({ error: 'invalid-password' });
      return;
    }

    try {
      const existingUser = await chats.getUserByUsername(username);

      if (existingUser) {
        res.status(409).json({ error: 'username-exists' });
        return;
      }

      await chats.createUser(username, password);

      const sid = await sessions.addSession(username);
      res.cookie('sid', sid, sessionCookieOptions);

      res.status(201).json({ username });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      res.status(500).json({ error: 'server-error' });
    }
  });

  app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!chats.isValidUsername(username)) {
      res.status(400).json({ error: 'invalid-username' });
      return;
    }

    if (!chats.isValidPassword(password)) {
      res.status(400).json({ error: 'invalid-password' });
      return;
    }

    try {
      const loginResult = await chats.verifyLogin(username, password);

      if (!loginResult.ok) {
        if (loginResult.error === 'user-not-found') {
          res.status(404).json({ error: 'user-not-found' });
          return;
        }

        res.status(401).json({ error: 'invalid-credentials' });
        return;
      }

      const sid = await sessions.addSession(username);
      res.cookie('sid', sid, sessionCookieOptions);

      res.json({ username });
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      res.status(500).json({ error: 'server-error' });
    }
  });

  app.delete('/api/session', async (req, res) => {
    const { sid, username } = await getRequestSession(req);

    if (sid) {
      res.clearCookie('sid', clearSessionCookieOptions);
    }

    if (username) {
      await sessions.deleteSession(sid);
    }

    res.json({ wasLoggedIn: !!username });
  });

  app.get('/api/messages', requireAuth, async (req, res) => {
    const { username } = req.session;
    const { before, limit } = req.query;

    try {
      const { hasMore, messagesList } = await chats.getMessages({ before, limit });
      res.json({ username, messagesList, hasMore });
    } catch (err) {
      console.error('MESSAGES ERROR:', err);
      res.status(500).json({ error: 'server-error' });
    }
  });

  app.get('/api/users', requireAuth, async (req, res) => {
    const { username } = req.session;

    try {
      const usersList = req.app.locals.io
        ? await getOnlineUsers(req.app.locals.io)
        : {};
      res.json({ username, usersList });
    } catch (err) {
      console.error('USERS ERROR:', err);
      res.status(500).json({ error: 'server-error' });
    }
  });

  async function attachSockets(server) {
    const io = new Server(server);
    app.locals.io = io;
    app.locals.redisAdapter = await attachRedisAdapter(io);

    io.use(async (socket, next) => {
      try {
        const sid = auth.getCookieValue(socket.handshake.headers.cookie, 'sid');
        const username = sid ? await sessions.getSessionUser(sid) : '';

        if (!sid || !username) {
          next(new Error('auth-missing'));
          return;
        }

        socket.data.username = username;
        next();
      } catch (err) {
        console.error('SOCKET AUTH ERROR:', err);
        next(new Error('server-error'));
      }
    });

    io.on('connection', async (socket) => {
      await broadcastUsers(io);

      socket.on('send-message', async ({ text }, ack) => {
        try {
          const username = socket.data.username;

          if (!username || !chats.isValidMessageText(text)) {
            socket.emit('chat-error', { error: 'required-message' });
            if (typeof ack === 'function') {
              ack({ ok: false, error: 'required-message' });
            }
            return;
          }

          await chats.addMessage({
            sender: username,
            text: text.trim(),
          });

          await broadcastMessages(io);

          if (typeof ack === 'function') {
            ack({ ok: true });
          }
        } catch (err) {
          socket.emit('chat-error', { error: 'server-error' });
          if (typeof ack === 'function') {
            ack({ ok: false, error: 'server-error' });
          }
        }
      });

      socket.on('disconnect', async () => {
        await broadcastUsers(io);
      });
    });

    return io;
  }

  return {
    app,
    attachSockets,
  };
}

async function startServer() {
  const { app, attachSockets } = createApp();
  const server = http.createServer(app);
  await attachSockets(server);

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
      resolve();
    });
  });

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  getClearSessionCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_MAX_AGE_MS,
  startServer,
};
