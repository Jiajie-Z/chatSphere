import { useEffect, useRef } from 'react';
import type { Message, PendingMessage } from '../types';

type MessageListProps = {
  messages: Message[];
  pendingMessages: PendingMessage[];
  currentUser: string;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  onLoadOlderMessages: () => void;
  onRetryMessage: (clientId: string) => void;
};

export default function MessageList({
  messages,
  pendingMessages,
  currentUser,
  hasMoreMessages,
  loadingOlderMessages,
  onLoadOlderMessages,
  onRetryMessage,
}: MessageListProps) {
  const bottomRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <ol className="messages">
      {hasMoreMessages ? (
        <li className="messages__pagination">
          <button
            className="load-older__button"
            type="button"
            disabled={loadingOlderMessages}
            onClick={onLoadOlderMessages}
          >
            {loadingOlderMessages ? 'Loading...' : 'Load older messages'}
          </button>
        </li>
      ) : null}

      {messages.length === 0 && pendingMessages.length === 0 ? (
        <li className="messages__empty">
          No messages yet. Start the conversation.
        </li>
      ) : null}

      {messages.map((message, index) => {
        const isSelf = message.sender === currentUser;
        const messageTime = message.created_at
          ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        return (
          <li
            className={`message-row ${isSelf ? 'message-row--self' : ''}`}
            key={`${message.sender}-${message.created_at || index}`}
          >
            <div className={`message ${isSelf ? 'message--self' : ''}`}>
              <span className="message__meta">
                <span className="message__sender">
                  {isSelf ? 'You' : message.sender}
                </span>
                {messageTime ? <span className="message__time">{messageTime}</span> : null}
              </span>
              <span className="message__text">{message.text}</span>
            </div>
          </li>
        );
      })}
      {pendingMessages.map((message) => (
        <li
          className="message-row message-row--self"
          key={message.clientId}
        >
          <div className={`message message--self message--${message.status}`}>
            <span className="message__meta">
              <span className="message__sender">You</span>
              <span className="message__time">now</span>
            </span>
            <span className="message__text">{message.text}</span>
            <span className="message__status">
              {message.status === 'sending' ? 'Sending...' : 'Failed'}
              {message.status === 'failed' ? (
                <button
                  className="message__retry"
                  type="button"
                  onClick={() => onRetryMessage(message.clientId)}
                >
                  Retry
                </button>
              ) : null}
            </span>
          </div>
        </li>
      ))}
      <li ref={bottomRef} className="messages__bottom" aria-hidden="true" />
    </ol>
  );
}
