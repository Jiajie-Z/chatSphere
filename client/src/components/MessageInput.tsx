import { useState, type FormEvent } from 'react';

const MAX_MESSAGE_LENGTH = 500;

type MessageInputProps = {
  isSending: boolean;
  onSendMessage: (text: string) => void;
};

export default function MessageInput({ isSending, onSendMessage }: MessageInputProps) {
  const [text, setText] = useState('');
  const trimmedLength = text.trim().length;
  const canSend = trimmedLength > 0 && trimmedLength <= MAX_MESSAGE_LENGTH;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canSend) {
      return;
    }

    onSendMessage(text);
    setText('');
  }

  return (
    <form className="outgoing-form" onSubmit={handleSubmit}>
      <label htmlFor="outgoing-message" className="visually-hidden">
        Message
      </label>
      <input
        id="outgoing-message"
        className="outgoing"
        name="text"
        type="text"
        placeholder="Type your message..."
        maxLength={MAX_MESSAGE_LENGTH}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <span className="message-count">{trimmedLength}/{MAX_MESSAGE_LENGTH}</span>
      <button className="send__button" type="submit" disabled={!canSend || isSending}>
        {isSending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
