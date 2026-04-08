import { useState } from 'react';

export default function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();

    onSendMessage(text);

    if (text.trim()) {
      setText('');
    }
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
      <button className="send__button" type="submit">
        Send
      </button>
    </form>
  );
}