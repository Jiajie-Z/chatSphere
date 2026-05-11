import { useEffect, useRef } from 'react';

export default function MessageList({ messages, currentUser }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ol className="messages">
      {messages.length === 0 ? (
        <li className="messages__empty">
          No messages yet. Start the conversation.
        </li>
      ) : null}

      {messages.map((message, index) => {
        const isSelf = message.sender === currentUser;

        return (
          <li
            className={`message-row ${isSelf ? 'message-row--self' : ''}`}
            key={`${message.sender}-${message.created_at || index}`}
          >
            <div className={`message ${isSelf ? 'message--self' : ''}`}>
              <span className="message__sender">
                {isSelf ? 'You' : message.sender}
              </span>
              <span className="message__text">{message.text}</span>
            </div>
          </li>
        );
      })}
      <li ref={bottomRef} className="messages__bottom" aria-hidden="true" />
    </ol>
  );
}
