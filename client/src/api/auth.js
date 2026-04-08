export function fetchRegister(username, password) {
  return fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .catch(() => Promise.reject({ error: 'network-error' }))
    .then(async (response) => {
      if (!response.ok) {
        throw await response.json();
      }
      return response.json();
    });
}

export function fetchLogin(username, password) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
    .catch(() => Promise.reject({ error: 'network-error' }))
    .then(async (response) => {
      if (!response.ok) {
        throw await response.json();
      }
      return response.json();
    });
}

export function fetchLogout() {
  return fetch('/api/session', {
    method: 'DELETE',
  })
    .catch(() => Promise.reject({ error: 'network-error' }))
    .then(async (response) => {
      if (!response.ok) {
        throw { error: 'logout-failed' };
      }
      return response.json();
    });
}

export function fetchSession() {
  return fetch('/api/session')
    .catch(() => Promise.reject({ error: 'network-error' }))
    .then(async (response) => {
      if (!response.ok) {
        throw { error: 'auth-missing' };
      }
      return response.json();
    });
}