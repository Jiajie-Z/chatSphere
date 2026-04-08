export default function MessageList({ messages }) {
  return (
    <ol className="messages">
      {messages.map((message, index) => (
        <li key={`${message.sender}-${message.created_at || index}`}>
          <div className="message">
            <span className="message__sender">{message.sender}:</span>
            <span className="message__text">{message.text}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}