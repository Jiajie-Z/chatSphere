const assert = require('node:assert/strict');
const test = require('node:test');

const chats = require('../chats');

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
