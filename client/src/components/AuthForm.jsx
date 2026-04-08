import { useState } from 'react';

export default function AuthForm({ mode, error, onLogin, onRegister, onSwitchMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e) {
    e.preventDefault();

    const trimmedUsername = username.trim();

    if (mode === 'login') {
      onLogin(trimmedUsername, password);
    } else {
      onRegister(trimmedUsername, password);
    }
  }

  return (
    <div id="login">
      <h1>{mode === 'login' ? 'Chatting Room' : 'Register'}</h1>

      {error ? <p className="form-error">{error}</p> : null}

      <form className={mode === 'login' ? 'login-form' : 'register-form'} onSubmit={handleSubmit}>
        <label htmlFor="username" className="login-form__label">
          Username
        </label>
        <input
          id="username"
          type="text"
          className="login-form__input"
          placeholder={mode === 'login' ? 'Enter your username' : 'Choose a username'}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label htmlFor="password" className="login-form__label">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="login-form__input"
          placeholder={mode === 'login' ? 'Enter your password' : 'Choose a password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="login-form__actions">
          {mode === 'login' ? (
            <>
              <button className="login__button" type="submit">
                Login
              </button>
              <button
                className="go-to-register__button"
                type="button"
                onClick={() => onSwitchMode('register')}
              >
                Go to Register
              </button>
            </>
          ) : (
            <>
              <button className="register__button" type="submit">
                Register
              </button>
              <button
                className="back-to-login__button"
                type="button"
                onClick={() => onSwitchMode('login')}
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}