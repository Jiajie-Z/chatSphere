const assert = require('node:assert/strict');
const test = require('node:test');

const chats = require('../chats');
const { getCookieValue } = require('../auth');

test('accepts valid usernames', () => {
  assert.equal(chats.isValidUsername('jiajie'), true);
  assert.equal(chats.isValidUsername('Jiajie_123'), true);
  assert.equal(chats.isValidUsername('user20chars________'), true);
});

test('rejects invalid usernames', () => {
  assert.equal(chats.isValidUsername(''), false);
  assert.equal(chats.isValidUsername('   '), false);
  assert.equal(chats.isValidUsername('user-name'), false);
  assert.equal(chats.isValidUsername('user name'), false);
  assert.equal(chats.isValidUsername('a'.repeat(21)), false);
  assert.equal(chats.isValidUsername(null), false);
});

test('validates password length', () => {
  assert.equal(chats.isValidPassword('secret'), true);
  assert.equal(chats.isValidPassword('a'.repeat(100)), true);
  assert.equal(chats.isValidPassword('short'), false);
  assert.equal(chats.isValidPassword('a'.repeat(101)), false);
  assert.equal(chats.isValidPassword(null), false);
});

test('validates message text length', () => {
  assert.equal(chats.isValidMessageText('hello'), true);
  assert.equal(chats.isValidMessageText('  hello  '), true);
  assert.equal(chats.isValidMessageText(''), false);
  assert.equal(chats.isValidMessageText('   '), false);
  assert.equal(chats.isValidMessageText('a'.repeat(chats.MAX_MESSAGE_LENGTH)), true);
  assert.equal(chats.isValidMessageText('a'.repeat(chats.MAX_MESSAGE_LENGTH + 1)), false);
  assert.equal(chats.isValidMessageText(null), false);
});

test('validates and normalizes channels', () => {
  assert.equal(chats.isValidChannel('general'), true);
  assert.equal(chats.isValidChannel('engineering'), true);
  assert.equal(chats.isValidChannel('missing'), false);
  assert.equal(chats.normalizeChannel('random'), 'random');
  assert.equal(chats.normalizeChannel('missing'), chats.DEFAULT_CHANNEL_ID);
});

test('reads a named cookie from a socket handshake header', () => {
  const header = 'theme=dark; sid=session-123%20abc; other=value';

  assert.equal(getCookieValue(header, 'sid'), 'session-123 abc');
  assert.equal(getCookieValue(header, 'missing'), '');
  assert.equal(getCookieValue('', 'sid'), '');
});
