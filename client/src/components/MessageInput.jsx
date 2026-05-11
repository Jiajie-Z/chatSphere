import { useState } from 'react';

export default function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  function handleSubmit(e) {
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
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="send__button" type="submit" disabled={!canSend}>
        Send
      </button>
    </form>
  );
}
