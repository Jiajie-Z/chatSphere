import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import type { Message, PendingMessage, UserMap } from '../types';

type ChatLayoutProps = {
  username: string;
  messages: Message[];
  pendingMessages: PendingMessage[];
  users: UserMap;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  error: string;
  onLogout: () => void;
  onLoadOlderMessages: () => void;
  onRetryMessage: (clientId: string) => void;
  onSendMessage: (text: string) => void;
};

export default function ChatLayout({
  username,
  messages,
  pendingMessages,
  users,
  hasMoreMessages,
  loadingOlderMessages,
  error,
  onLogout,
  onLoadOlderMessages,
  onRetryMessage,
  onSendMessage,
}: ChatLayoutProps) {
  return (
    <div id="chat">
      <div id="welcome">
        <div>
          <p className="app-name">ChatSphere</p>
          <p className="welcome__user">Signed in as {username}</p>
        </div>
        <div id="logout">
          <button className="logout__button" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {error ? <p className="chat-error">{error}</p> : null}

      <div id="main">
        <div id="users">
          <h2 className="panel-title">Online</h2>
          <UserList users={users} currentUser={username} />
        </div>

        <div id="messages">
          <MessageList
            messages={messages}
            pendingMessages={pendingMessages}
            currentUser={username}
            hasMoreMessages={hasMoreMessages}
            loadingOlderMessages={loadingOlderMessages}
            onLoadOlderMessages={onLoadOlderMessages}
            onRetryMessage={onRetryMessage}
          />
        </div>
      </div>

      <div id="outgoing">
        <MessageInput
          isSending={pendingMessages.some((message) => message.status === 'sending')}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
}
