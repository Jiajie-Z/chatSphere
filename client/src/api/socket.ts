import { io, type Socket } from 'socket.io-client';
import type { ApiError, Message, UserMap } from '../types';

let socket: Socket | null = null;

export function connectSocket(
  onMessagesUpdated: (messages: Message[]) => void,
  onUsersUpdated: (users: UserMap) => void,
  onError: (error: ApiError) => void
) {
  if (socket) {
    socket.disconnect();
  }

  socket = io('/', {
    transports: ['websocket', 'polling'],
  });

  socket.on('messages-updated', onMessagesUpdated);
  socket.on('users-updated', onUsersUpdated);
  socket.on('chat-error', onError);
  socket.on('connect_error', (err) => {
    const errorCode = err.message === 'auth-missing' ? 'auth-missing' : 'server-error';
    onError({ error: errorCode });
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

type SendMessageAck = {
  ok: boolean;
  error?: ApiError['error'];
};

export function sendSocketMessage(text: string): Promise<void> {
  if (!socket) {
    return Promise.reject({ error: 'network-error' } satisfies ApiError);
  }

  return new Promise((resolve, reject) => {
    socket?.timeout(5000).emit('send-message', { text }, (err: Error | null, response?: SendMessageAck) => {
      if (err) {
        reject({ error: 'network-error' } satisfies ApiError);
        return;
      }

      if (!response?.ok) {
        reject({ error: response?.error || 'server-error' } satisfies ApiError);
        return;
      }

      resolve();
    });
  });
}
