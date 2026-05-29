import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import type { Channel, Message, PendingMessage, UserMap } from '../types';

type ChatLayoutProps = {
  username: string;
  activeChannel: string;
  channels: Channel[];
  messages: Message[];
  pendingMessages: PendingMessage[];
  users: UserMap;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  error: string;
  onChannelChange: (channel: string) => void;
  onLogout: () => void;
  onLoadOlderMessages: () => void;
  onRetryMessage: (clientId: string) => void;
  onSendMessage: (text: string) => void;
};

export default function ChatLayout({
  username,
  activeChannel,
  channels,
  messages,
  pendingMessages,
  users,
  hasMoreMessages,
  loadingOlderMessages,
  error,
  onChannelChange,
  onLogout,
  onLoadOlderMessages,
  onRetryMessage,
  onSendMessage,
}: ChatLayoutProps) {
  const onlineCount = Object.keys(users).length;
  const activeChannelName = channels.find((channel) => channel.id === activeChannel)?.name || 'General';

  return (
    <div id="chat">
      <div id="welcome">
        <div className="chat-title">
          <div className="brand-lockup">
            <span className="brand-mark brand-mark--small" aria-hidden="true">CS</span>
            <p className="app-name">ChatSphere</p>
          </div>
          <p className="welcome__user">Signed in as {username}</p>
        </div>
        <div className="header-actions">
          <span className="connection-pill">
            <span className="connection-pill__dot" aria-hidden="true" />
            Live
          </span>
          <button className="logout__button" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {error ? <p className="chat-error">{error}</p> : null}

      <div id="main">
        <div id="users">
          <div className="channel-list">
            {channels.map((channel) => (
              <button
                className={`channel-button ${channel.id === activeChannel ? 'channel-button--active' : ''}`}
                key={channel.id}
                type="button"
                onClick={() => onChannelChange(channel.id)}
              >
                <span className="channel-button__hash">#</span>
                <span className="channel-button__name">{channel.name}</span>
              </button>
            ))}
          </div>

          <div className="panel-heading">
            <h2 className="panel-title">{activeChannelName} Online</h2>
            <span className="panel-count">{onlineCount}</span>
          </div>
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
