import type { MessagesResponse, UsersResponse } from '../types';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw await response.json();
  }

  return response.json() as Promise<T>;
}

function rejectNetworkError(): Promise<never> {
  return Promise.reject({ error: 'network-error' });
}

type FetchMessagesOptions = {
  before?: number;
  limit?: number;
};

export function fetchMessages(options: FetchMessagesOptions = {}): Promise<MessagesResponse> {
  const params = new URLSearchParams();

  if (options.before) {
    params.set('before', String(options.before));
  }

  if (options.limit) {
    params.set('limit', String(options.limit));
  }

  const queryString = params.toString();
  const url = queryString ? `/api/messages?${queryString}` : '/api/messages';

  return fetch(url)
    .catch(rejectNetworkError)
    .then((response) => parseJsonResponse<MessagesResponse>(response));
}

export function fetchUsers(): Promise<UsersResponse> {
  return fetch('/api/users')
    .catch(rejectNetworkError)
    .then((response) => parseJsonResponse<UsersResponse>(response));
}
