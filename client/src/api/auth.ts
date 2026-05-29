import type { ApiError, AuthResponse, LogoutResponse, SessionResponse } from '../types';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await response.json() as ApiError;
  }

  return response.json() as Promise<T>;
}

function rejectNetworkError(): Promise<never> {
  return Promise.reject({ error: 'network-error' } satisfies ApiError);
}

export function fetchRegister(username: string, password: string): Promise<AuthResponse> {
  return fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .catch(rejectNetworkError)
    .then((response) => parseJsonResponse<AuthResponse>(response));
}

export function fetchLogin(username: string, password: string): Promise<AuthResponse> {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .catch(rejectNetworkError)
    .then((response) => parseJsonResponse<AuthResponse>(response));
}

export function fetchLogout(): Promise<LogoutResponse> {
  return fetch('/api/session', {
    method: 'DELETE',
  })
    .catch(rejectNetworkError)
    .then((response) => {
      if (!response.ok) {
        throw { error: 'logout-failed' } satisfies ApiError;
      }

      return response.json() as Promise<LogoutResponse>;
    });
}

export function fetchSession(): Promise<SessionResponse> {
  return fetch('/api/session')
    .catch(rejectNetworkError)
    .then((response) => {
      if (!response.ok) {
        throw { error: 'auth-missing' } satisfies ApiError;
      }

      return response.json() as Promise<SessionResponse>;
    });
}
