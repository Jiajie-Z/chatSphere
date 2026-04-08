const crypto = require('crypto');
const { getPool } = require('./db');

function generateSessionId(username) {
  return `session-${crypto.randomUUID()}-${username}`;
}

async function addSession(username) {
  const pool = await getPool();
  const sid = generateSessionId(username);

  await pool.execute(
    'INSERT INTO sessions (sid, username) VALUES (?, ?)',
    [sid, username]
  );

  return sid;
}

async function getSessionUser(sid) {
  const pool = await getPool();

  const [rows] = await pool.execute(
    'SELECT username FROM sessions WHERE sid = ?',
    [sid]
  );

  if (!rows.length) {
    return '';
  }

  return rows[0].username;
}

async function deleteSession(sid) {
  const pool = await getPool();

  await pool.execute(
    'DELETE FROM sessions WHERE sid = ?',
    [sid]
  );
}

async function getLoggedInUsers() {
  const pool = await getPool();

  const [rows] = await pool.execute(
    'SELECT DISTINCT username FROM sessions ORDER BY username'
  );

  const users = {};
  rows.forEach(({ username }) => {
    users[username] = username;
  });

  return users;
}

module.exports = {
  addSession,
  deleteSession,
  getSessionUser,
  getLoggedInUsers,
};