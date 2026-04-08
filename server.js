const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const sessions = require('./sessions');
const chats = require('./chats');

app.use(cookieParser());
app.use(express.static('./public'));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server);

const onlineSockets = new Map();

async function broadcastUsers() {
  try {
    const usersList = await sessions.getLoggedInUsers();
    io.emit('users-updated', usersList);
  } catch (err) {
    console.error('Failed to broadcast users:', err);
  }
}

async function broadcastMessages() {
  try {
    const messagesList = await chats.getMessages();
    io.emit('messages-updated', messagesList);
  } catch (err) {
    console.error('Failed to broadcast messages:', err);
  }
}

io.on('connection', (socket) => {
  socket.on('join-chat', async ({ username }) => {
    if (!username) {
      return;
    }

    onlineSockets.set(socket.id, username);
    await broadcastUsers();
  });

  socket.on('send-message', async ({ username, text }) => {
    try {
      if (!username || !text || !text.trim()) {
        socket.emit('chat-error', { error: 'required-message' });
        return;
      }

      await chats.addMessage({
        sender: username,
        text: text.trim(),
      });

      await broadcastMessages();
    } catch (err) {
      socket.emit('chat-error', { error: 'server-error' });
    }
  });

  socket.on('disconnect', async () => {
    onlineSockets.delete(socket.id);
    await broadcastUsers();
  });
});

app.get('/api/session', async (req, res) => {
  const sid = req.cookies.sid;
  const username = sid ? await sessions.getSessionUser(sid) : '';

  if (!sid || !username) {
    res.status(401).json({ error: 'auth-missing' });
    return;
  }

  res.json({ username });
});

app.post('/api/auth/register', async (req, res) => {
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
    res.cookie('sid', sid, { httpOnly: true });

    res.status(201).json({ username });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'server-error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
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
    res.cookie('sid', sid, { httpOnly: true });

    res.json({ username });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'server-error' });
  }
});

app.delete('/api/session', async (req, res) => {
  const sid = req.cookies.sid;
  const username = sid ? await sessions.getSessionUser(sid) : '';

  if (sid) {
    res.clearCookie('sid');
  }

  if (username) {
    await sessions.deleteSession(sid);
  }

  await broadcastUsers();
  res.json({ wasLoggedIn: !!username });
});

app.get('/api/messages', async (req, res) => {
  const sid = req.cookies.sid;
  const username = sid ? await sessions.getSessionUser(sid) : '';

  if (!sid || !username) {
    res.status(401).json({ error: 'auth-missing' });
    return;
  }

  try {
    const messagesList = await chats.getMessages();
    res.json({ username, messagesList });
  } catch (err) {
    console.error('MESSAGES ERROR:', err);
    res.status(500).json({ error: 'server-error' });
  }
});

app.get('/api/users', async (req, res) => {
  const sid = req.cookies.sid;
  const username = sid ? await sessions.getSessionUser(sid) : '';

  if (!sid || !username) {
    res.status(401).json({ error: 'auth-missing' });
    return;
  }

  try {
    const usersList = await sessions.getLoggedInUsers();
    res.json({ username, usersList });
  } catch (err) {
    console.error('USERS ERROR:', err);
    res.status(500).json({ error: 'server-error' });
  }
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});