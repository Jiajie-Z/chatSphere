export type AuthMode = 'login' | 'register';

export type ApiErrorCode =
  | 'auth-missing'
  | 'invalid-credentials'
  | 'invalid-message'
  | 'invalid-password'
  | 'invalid-username'
  | 'logout-failed'
  | 'network-error'
  | 'rate-limited'
  | 'required-message'
  | 'server-error'
  | 'user-not-found'
  | 'username-exists';

export type ApiError = {
  error: ApiErrorCode;
};

export type Message = {
  id: number;
  channel: string;
  sender: string;
  text: string;
  created_at?: string;
};

export type PendingMessage = {
  clientId: string;
  sender: string;
  status: 'failed' | 'sending';
  text: string;
};

export type UserMap = Record<string, string>;

export type Channel = {
  id: string;
  name: string;
};

export type ChannelsResponse = {
  channels: Channel[];
};

export type SessionResponse = {
  username: string;
};

export type AuthResponse = {
  username: string;
};

export type LogoutResponse = {
  wasLoggedIn: boolean;
};

export type MessagesResponse = {
  username: string;
  channel: string;
  messagesList: Message[];
  hasMore: boolean;
};

export type UsersResponse = {
  username: string;
  channel: string;
  usersList: UserMap;
};
