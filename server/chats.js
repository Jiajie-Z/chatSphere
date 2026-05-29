const { getPool } = require('./db');
const bcrypt = require('bcrypt');

const DEFAULT_MESSAGE_LIMIT = 50;
const DEFAULT_CHANNEL_ID = 'general';
const MAX_MESSAGE_LIMIT = 100;
const MAX_MESSAGE_LENGTH = 500;
const CHANNELS = [
  { id: 'general', name: 'General' },
  { id: 'engineering', name: 'Engineering' },
  { id: 'random', name: 'Random' },
];

let messageSchemaReady = false;

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

function isValidChannel(channel) {
  return CHANNELS.some((item) => item.id === channel);
}

function normalizeChannel(channel) {
  return isValidChannel(channel) ? channel : DEFAULT_CHANNEL_ID;
}

async function ensureMessageSchema() {
  if (messageSchemaReady) {
    return;
  }

  const pool = await getPool();
  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND COLUMN_NAME = 'channel'`
  );

  if (!columns.length) {
    await pool.execute(
      `ALTER TABLE messages
       ADD COLUMN channel VARCHAR(32) NOT NULL DEFAULT 'general' AFTER id`
    );
  }

  const [indexes] = await pool.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'messages'
       AND INDEX_NAME = 'idx_messages_channel_id'`
  );

  if (!indexes.length) {
    await pool.execute(
      'CREATE INDEX idx_messages_channel_id ON messages (channel, id)'
    );
  }

  messageSchemaReady = true;
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

async function addMessage({ channel = DEFAULT_CHANNEL_ID, sender, text }) {
  await ensureMessageSchema();
  const pool = await getPool();
  const normalizedChannel = normalizeChannel(channel);

  await pool.execute(
    'INSERT INTO messages (channel, sender, text) VALUES (?, ?, ?)',
    [normalizedChannel, sender, text]
  );
}

async function getMessages({ before, channel, limit } = {}) {
  await ensureMessageSchema();
  const pool = await getPool();
  const normalizedChannel = normalizeChannel(channel);
  const messageLimit = normalizeMessageLimit(limit);
  const beforeId = normalizeMessageCursor(before);

  const queryLimit = messageLimit + 1;
  const params = beforeId ? [normalizedChannel, beforeId] : [normalizedChannel];
  const cursorClause = beforeId ? 'AND id < ?' : '';

  const [rows] = await pool.execute(
    `SELECT id, channel, sender, text, created_at
     FROM messages
     WHERE channel = ?
     ${cursorClause}
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
  CHANNELS,
  DEFAULT_CHANNEL_ID,
  MAX_MESSAGE_LENGTH,
  ensureMessageSchema,
  isValidChannel,
  isValidUsername,
  isValidPassword,
  isValidMessageText,
  normalizeChannel,
  getUserByUsername,
  createUser,
  verifyLogin,
  addMessage,
  getMessages,
};
