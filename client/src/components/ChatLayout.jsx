import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatLayout({
  username,
  messages,
  users,
  error,
  onLogout,
  onSendMessage,
}) {
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
          <MessageList messages={messages} currentUser={username} />
        </div>
      </div>

      <div id="outgoing">
        <MessageInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
}
