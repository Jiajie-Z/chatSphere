import { useCallback, useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import ChatLayout from './components/ChatLayout';
import { fetchSession, fetchLogin, fetchRegister, fetchLogout } from './api/auth';
import { fetchChannels, fetchMessages, fetchUsers } from './api/chat';
import { connectSocket, disconnectSocket, sendSocketMessage } from './api/socket';
import type { ApiError, AuthMode, Channel, Message, PendingMessage, UserMap } from './types';

const DEFAULT_CHANNEL_ID = 'general';
const MESSAGE_PAGE_SIZE = 50;

export default function App() {
  const [username, setUsername] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState(DEFAULT_CHANNEL_ID);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(true);

  function mapError(err: Partial<ApiError> | undefined, fallback = 'Something went wrong.') {
    if (err?.error === 'invalid-username') {
      return 'Username format is invalid.';
    }
    if (err?.error === 'invalid-password') {
      return 'Password must be at least 6 characters.';
    }
    if (err?.error === 'user-not-found') {
      return 'User does not exist. Please register first.';
    }
    if (err?.error === 'invalid-credentials') {
      return 'Incorrect username or password.';
    }
    if (err?.error === 'username-exists') {
      return 'That username is already taken.';
    }
    if (err?.error === 'required-message') {
      return 'Message must be 1-500 characters.';
    }
    if (err?.error === 'invalid-message') {
      return 'Message must be 1-500 characters.';
    }
    if (err?.error === 'network-error') {
      return 'Network error. Please try again.';
    }
    if (err?.error === 'rate-limited') {
      return 'Too many attempts. Please wait a minute and try again.';
    }
    if (err?.error === 'auth-missing') {
      return '';
    }
    return fallback;
  }

  const loadInitialChatData = useCallback((channel: string) => {
    return Promise.all([fetchChannels(), fetchMessages({ channel }), fetchUsers(channel)]).then(([channelsRes, msgRes, userRes]) => {
      setChannels(channelsRes.channels || []);
      setMessages(msgRes.messagesList || []);
      setHasMoreMessages(!!msgRes.hasMore);
      setUsers(userRes.usersList || {});
    });
  }, []);

  function mergeMessages(currentMessages: Message[], olderMessages: Message[]) {
    const seenIds = new Set(currentMessages.map((message) => message.id));
    const uniqueOlderMessages = olderMessages.filter((message) => !seenIds.has(message.id));

    return [...uniqueOlderMessages, ...currentMessages];
  }

  useEffect(() => {
    fetchSession()
      .then((res) => {
        setUsername(res.username);
        return loadInitialChatData(DEFAULT_CHANNEL_ID);
      })
      .catch((err: ApiError) => {
        if (err?.error !== 'auth-missing') {
          setError(mapError(err, 'Failed to load session.'));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadInitialChatData]);

  useEffect(() => {
    if (!username) {
      return;
    }

    connectSocket(
      activeChannel,
      (messagesList) => {
        setMessages(messagesList || []);
        setPendingMessages((currentPendingMessages) => (
          currentPendingMessages.filter((message) => message.status === 'failed')
        ));
        setHasMoreMessages((messagesList || []).length >= MESSAGE_PAGE_SIZE);
      },
      (usersList) => {
        setUsers(usersList || {});
      },
      (err) => {
        setError(mapError(err, 'Socket error.'));
      }
    );

    return () => {
      disconnectSocket();
    };
  }, [username, activeChannel]);

  function handleLogin(inputUsername: string, password: string) {
    setError('');

    fetchLogin(inputUsername, password)
      .then((res) => {
        setUsername(res.username);
        setAuthMode('login');
        return loadInitialChatData(activeChannel);
      })
      .catch((err: ApiError) => {
        setError(mapError(err, 'Login failed. Please try again.'));
      });
  }

  function handleRegister(inputUsername: string, password: string) {
    setError('');

    fetchRegister(inputUsername, password)
      .then((res) => {
        setUsername(res.username);
        setAuthMode('login');
        return loadInitialChatData(activeChannel);
      })
      .catch((err: ApiError) => {
        setError(mapError(err, 'Registration failed. Please try again.'));
      });
  }

  function handleLogout() {
    fetchLogout()
      .then(() => {
        disconnectSocket();
        setUsername('');
        setActiveChannel(DEFAULT_CHANNEL_ID);
        setMessages([]);
        setPendingMessages([]);
        setUsers({});
        setHasMoreMessages(false);
        setLoadingOlderMessages(false);
        setError('');
        setAuthMode('login');
      })
      .catch((err: ApiError) => {
        setError(mapError(err, 'Logout failed.'));
      });
  }

  function handleSendMessage(text: string) {
    if (!text.trim()) {
      setError('Message must be 1-500 characters.');
      return;
    }

    const clientId = `pending-${Date.now()}-${crypto.randomUUID()}`;
    const pendingMessage: PendingMessage = {
      clientId,
      sender: username,
      status: 'sending',
      text: text.trim(),
    };

    setPendingMessages((currentPendingMessages) => [...currentPendingMessages, pendingMessage]);
    setError('');

    sendSocketMessage(text)
      .then(() => {
        setPendingMessages((currentPendingMessages) => (
          currentPendingMessages.filter((message) => message.clientId !== clientId)
        ));
      })
      .catch((err: ApiError) => {
        setPendingMessages((currentPendingMessages) => (
          currentPendingMessages.map((message) => (
            message.clientId === clientId
              ? { ...message, status: 'failed' }
              : message
          ))
        ));
        setError(mapError(err, 'Failed to send message.'));
      });
  }

  function handleChannelChange(channel: string) {
    if (channel === activeChannel) {
      return;
    }

    setActiveChannel(channel);
    setMessages([]);
    setPendingMessages([]);
    setUsers({});
    setHasMoreMessages(false);
    setLoadingOlderMessages(false);
    setError('');
    loadInitialChatData(channel).catch((err: ApiError) => {
      setError(mapError(err, 'Failed to load channel.'));
    });
  }

  function handleRetryMessage(clientId: string) {
    const pendingMessage = pendingMessages.find((message) => message.clientId === clientId);

    if (!pendingMessage || pendingMessage.status === 'sending') {
      return;
    }

    setPendingMessages((currentPendingMessages) => (
      currentPendingMessages.map((message) => (
        message.clientId === clientId
          ? { ...message, status: 'sending' }
          : message
      ))
    ));
    setError('');

    sendSocketMessage(pendingMessage.text)
      .then(() => {
        setPendingMessages((currentPendingMessages) => (
          currentPendingMessages.filter((message) => message.clientId !== clientId)
        ));
      })
      .catch((err: ApiError) => {
        setPendingMessages((currentPendingMessages) => (
          currentPendingMessages.map((message) => (
            message.clientId === clientId
              ? { ...message, status: 'failed' }
              : message
          ))
        ));
        setError(mapError(err, 'Failed to resend message.'));
      });
  }

  function handleLoadOlderMessages() {
    const oldestMessageId = messages[0]?.id;

    if (!oldestMessageId || loadingOlderMessages) {
      return;
    }

    setLoadingOlderMessages(true);
    setError('');

    fetchMessages({ before: oldestMessageId, channel: activeChannel, limit: MESSAGE_PAGE_SIZE })
      .then((res) => {
        setMessages((currentMessages) => mergeMessages(currentMessages, res.messagesList || []));
        setHasMoreMessages(!!res.hasMore);
      })
      .catch((err: ApiError) => {
        setError(mapError(err, 'Failed to load older messages.'));
      })
      .finally(() => {
        setLoadingOlderMessages(false);
      });
  }

  if (loading) {
    return (
      <div className="loading-indicator visible">
        <div className="gg-spinner"></div>
      </div>
    );
  }

  if (!username) {
    return (
      <AuthForm
        mode={authMode}
        error={error}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onSwitchMode={setAuthMode}
      />
    );
  }

  return (
    <ChatLayout
      username={username}
      activeChannel={activeChannel}
      channels={channels}
      messages={messages}
      pendingMessages={pendingMessages}
      users={users}
      hasMoreMessages={hasMoreMessages}
      loadingOlderMessages={loadingOlderMessages}
      error={error}
      onChannelChange={handleChannelChange}
      onLogout={handleLogout}
      onLoadOlderMessages={handleLoadOlderMessages}
      onRetryMessage={handleRetryMessage}
      onSendMessage={handleSendMessage}
    />
  );
}
