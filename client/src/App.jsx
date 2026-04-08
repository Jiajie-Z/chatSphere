import { useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import ChatLayout from './components/ChatLayout';
import { fetchSession, fetchLogin, fetchRegister, fetchLogout } from './api/auth';
import { fetchMessages, fetchUsers } from './api/chat';
import { connectSocket, disconnectSocket, sendSocketMessage } from './api/socket';

export default function App() {
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(true);

  function mapError(err, fallback = 'Something went wrong.') {
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
      return 'Message cannot be empty.';
    }
    if (err?.error === 'network-error') {
      return 'Network error. Please try again.';
    }
    if (err?.error === 'auth-missing') {
      return '';
    }
    return fallback;
  }

  function loadInitialChatData() {
    return Promise.all([fetchMessages(), fetchUsers()]).then(([msgRes, userRes]) => {
      setMessages(msgRes.messagesList || []);
      setUsers(userRes.usersList || {});
    });
  }

  useEffect(() => {
    fetchSession()
      .then((res) => {
        setUsername(res.username);
        return loadInitialChatData();
      })
      .catch((err) => {
        if (err?.error !== 'auth-missing') {
          setError(mapError(err, 'Failed to load session.'));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!username) {
      return;
    }

    connectSocket(
      username,
      (messagesList) => {
        setMessages(messagesList || []);
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
  }, [username]);

  function handleLogin(inputUsername, password) {
    setError('');

    fetchLogin(inputUsername, password)
      .then((res) => {
        setUsername(res.username);
        setAuthMode('login');
        return loadInitialChatData();
      })
      .catch((err) => {
        setError(mapError(err, 'Login failed. Please try again.'));
      });
  }

  function handleRegister(inputUsername, password) {
    setError('');

    fetchRegister(inputUsername, password)
      .then((res) => {
        setUsername(res.username);
        setAuthMode('login');
        return loadInitialChatData();
      })
      .catch((err) => {
        setError(mapError(err, 'Registration failed. Please try again.'));
      });
  }

  function handleLogout() {
    fetchLogout()
      .then(() => {
        disconnectSocket();
        setUsername('');
        setMessages([]);
        setUsers({});
        setError('');
        setAuthMode('login');
      })
      .catch((err) => {
        setError(mapError(err, 'Logout failed.'));
      });
  }

  function handleSendMessage(text) {
    if (!text.trim()) {
      setError('Message cannot be empty.');
      return;
    }

    setError('');

    sendSocketMessage(username, text).catch((err) => {
      setError(mapError(err, 'Failed to send message.'));
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
      messages={messages}
      users={users}
      error={error}
      onLogout={handleLogout}
      onSendMessage={handleSendMessage}
    />
  );
}