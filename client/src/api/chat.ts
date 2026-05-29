import type { ChannelsResponse, MessagesResponse, UsersResponse } from '../types';

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
  channel?: string;
  limit?: number;
};

export function fetchChannels(): Promise<ChannelsResponse> {
  return fetch('/api/channels')
    .catch(rejectNetworkError)
    .then((response) => parseJsonResponse<ChannelsResponse>(response));
}

export function fetchMessages(options: FetchMessagesOptions = {}): Promise<MessagesResponse> {
  const params = new URLSearchParams();

  if (options.channel) {
    params.set('channel', options.channel);
  }

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

export function fetchUsers(channel?: string): Promise<UsersResponse> {
  const params = new URLSearchParams();

  if (channel) {
    params.set('channel', channel);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/users?${queryString}` : '/api/users';

  return fetch(url)
    .catch(rejectNetworkError)
    .then((response) => parseJsonResponse<UsersResponse>(response));
}
