import { useState, type FormEvent } from 'react';
import type { AuthMode } from '../types';

type AuthFormProps = {
  mode: AuthMode;
  error: string;
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string) => void;
  onSwitchMode: (mode: AuthMode) => void;
};

export default function AuthForm({ mode, error, onLogin, onRegister, onSwitchMode }: AuthFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
      <div className="auth-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">CS</span>
          <p className="app-name">ChatSphere</p>
        </div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">{mode === 'login' ? 'Sign in to continue.' : 'Choose your credentials.'}</p>
      </div>

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
                Create account
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
