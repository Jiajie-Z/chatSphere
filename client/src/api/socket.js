import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(username, onMessagesUpdated, onUsersUpdated, onError) {
  if (socket) {
    socket.disconnect();
  }

  socket = io('/', {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket.emit('join-chat', { username });
  });

  socket.on('messages-updated', onMessagesUpdated);
  socket.on('users-updated', onUsersUpdated);
  socket.on('chat-error', onError);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function sendSocketMessage(username, text) {
  if (!socket) {
    return Promise.reject({ error: 'network-error' });
  }

  socket.emit('send-message', { username, text });
  return Promise.resolve();
}