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

  function getChannelRoom(channel) {
    return `channel:${chats.normalizeChannel(channel)}`;
  }

  async function getChannelUsers(io, channel) {
    const sockets = await io.in(getChannelRoom(channel)).fetchSockets();
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

  async function broadcastUsers(io, channel) {
    io.to(getChannelRoom(channel)).emit('users-updated', await getChannelUsers(io, channel));
  }

  async function broadcastMessages(io, channel) {
    try {
      const normalizedChannel = chats.normalizeChannel(channel);
      const { messagesList } = await chats.getMessages({ channel: normalizedChannel });
      io.to(getChannelRoom(normalizedChannel)).emit('messages-updated', messagesList);
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

  app.get('/api/channels', requireAuth, async (req, res) => {
    res.json({ channels: chats.CHANNELS });
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
    const { before, channel, limit } = req.query;
    const normalizedChannel = chats.normalizeChannel(channel);

    try {
      const { hasMore, messagesList } = await chats.getMessages({
        before,
        channel: normalizedChannel,
        limit,
      });
      res.json({ username, channel: normalizedChannel, messagesList, hasMore });
    } catch (err) {
      console.error('MESSAGES ERROR:', err);
      res.status(500).json({ error: 'server-error' });
    }
  });

  app.get('/api/users', requireAuth, async (req, res) => {
    const { username } = req.session;
    const channel = chats.normalizeChannel(req.query.channel);

    try {
      const usersList = req.app.locals.io
        ? await getChannelUsers(req.app.locals.io, channel)
        : {};
      res.json({ username, channel, usersList });
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
      async function joinChannel(channel) {
        const nextChannel = chats.normalizeChannel(channel);
        const previousChannel = socket.data.channel;

        if (previousChannel) {
          socket.leave(getChannelRoom(previousChannel));
        }

        socket.data.channel = nextChannel;
        socket.join(getChannelRoom(nextChannel));

        if (previousChannel && previousChannel !== nextChannel) {
          await broadcastUsers(io, previousChannel);
        }

        await broadcastUsers(io, nextChannel);
      }

      await joinChannel(chats.DEFAULT_CHANNEL_ID);

      socket.on('join-channel', async ({ channel }, ack) => {
        try {
          await joinChannel(channel);
          if (typeof ack === 'function') {
            ack({ ok: true, channel: socket.data.channel });
          }
        } catch (err) {
          if (typeof ack === 'function') {
            ack({ ok: false, error: 'server-error' });
          }
        }
      });

      socket.on('send-message', async ({ text }, ack) => {
        try {
          const username = socket.data.username;
          const channel = socket.data.channel || chats.DEFAULT_CHANNEL_ID;

          if (!username || !chats.isValidMessageText(text)) {
            socket.emit('chat-error', { error: 'required-message' });
            if (typeof ack === 'function') {
              ack({ ok: false, error: 'required-message' });
            }
            return;
          }

          await chats.addMessage({
            channel,
            sender: username,
            text: text.trim(),
          });

          await broadcastMessages(io, channel);

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
        if (socket.data.channel) {
          await broadcastUsers(io, socket.data.channel);
        }
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
