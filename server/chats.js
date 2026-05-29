const { getPool } = require('./db');
const bcrypt = require('bcrypt');

const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 500;

function isValidUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const trimmed = username.trim();

  return !!trimmed
    && trimmed.length <= 20
    && /^[A-Za-z0-9_]+$/.test(trimmed);
}

function isValidPassword(password) {
  return !!password
    && typeof password === 'string'
    && password.length >= 6
    && password.length <= 100;
}

function isValidMessageText(text) {
  return !!text
    && typeof text === 'string'
    && text.trim().length > 0
    && text.trim().length <= MAX_MESSAGE_LENGTH;
}

function normalizeMessageLimit(limit) {
  const parsedLimit = Number.parseInt(limit, 10);

  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  return Math.min(parsedLimit, MAX_MESSAGE_LIMIT);
}

function normalizeMessageCursor(before) {
  const parsedBefore = Number.parseInt(before, 10);

  if (Number.isNaN(parsedBefore) || parsedBefore <= 0) {
    return null;
  }

  return parsedBefore;
}

async function getUserByUsername(username) {
  const pool = await getPool();

  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, created_at FROM users WHERE username = ?',
    [username]
  );

  return rows[0] || null;
}

async function createUser(username, password) {
  const pool = await getPool();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, passwordHash]
  );
}

async function verifyLogin(username, password) {
  const user = await getUserByUsername(username);

  if (!user) {
    return { ok: false, error: 'user-not-found' };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return { ok: false, error: 'invalid-credentials' };
  }

  return { ok: true };
}

async function addMessage({ sender, text }) {
  const pool = await getPool();

  await pool.execute(
    'INSERT INTO messages (sender, text) VALUES (?, ?)',
    [sender, text]
  );
}

async function getMessages({ before, limit } = {}) {
  const pool = await getPool();
  const messageLimit = normalizeMessageLimit(limit);
  const beforeId = normalizeMessageCursor(before);

  const queryLimit = messageLimit + 1;
  const params = beforeId ? [beforeId] : [];
  const whereClause = beforeId ? 'WHERE id < ?' : '';

  const [rows] = await pool.execute(
    `SELECT id, sender, text, created_at
     FROM messages
     ${whereClause}
     ORDER BY id DESC
     LIMIT ${queryLimit}`,
    params
  );

  const hasMore = rows.length > messageLimit;
  const messagesList = rows.slice(0, messageLimit).reverse();

  return {
    hasMore,
    messagesList,
  };
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  isValidUsername,
  isValidPassword,
  isValidMessageText,
  getUserByUsername,
  createUser,
  verifyLogin,
  addMessage,
  getMessages,
};
