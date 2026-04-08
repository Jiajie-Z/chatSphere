const { getPool } = require('./db');
const bcrypt = require('bcrypt');

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

async function getMessages() {
  const pool = await getPool();

  const [rows] = await pool.execute(
    'SELECT sender, text, created_at FROM messages ORDER BY id ASC'
  );

  return rows;
}

module.exports = {
  isValidUsername,
  isValidPassword,
  getUserByUsername,
  createUser,
  verifyLogin,
  addMessage,
  getMessages,
};