export function fetchMessages() {
  return fetch('/api/messages')
    .catch(() => Promise.reject({ error: 'network-error' }))
    .then(async (response) => {
      if (!response.ok) {
        throw await response.json();
      }
      return response.json();
    });
}

export function fetchUsers() {
  return fetch('/api/users')
    .catch(() => Promise.reject({ error: 'network-error' }))
    .then(async (response) => {
      if (!response.ok) {
        throw await response.json();
      }
      return response.json();
    });
}