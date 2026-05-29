const sessions = require('./sessions');

function createGetRequestSession(sessionStore) {
  return async function getRequestSession(req) {
    const sid = req.cookies.sid;
    const username = sid ? await sessionStore.getSessionUser(sid) : '';

    return {
      sid,
      username,
      isAuthenticated: !!sid && !!username,
    };
  };
}

async function getRequestSession(req) {
  const sid = req.cookies.sid;
  const username = sid ? await sessions.getSessionUser(sid) : '';

  return {
    sid,
    username,
    isAuthenticated: !!sid && !!username,
  };
}

function createRequireAuth(resolveRequestSession) {
  return async function requireAuth(req, res, next) {
    try {
      const session = await resolveRequestSession(req);

      if (!session.isAuthenticated) {
        res.status(401).json({ error: 'auth-missing' });
        return;
      }

      req.session = session;
      next();
    } catch (err) {
      console.error('AUTH ERROR:', err);
      res.status(500).json({ error: 'server-error' });
    }
  };
}

const requireAuth = createRequireAuth(getRequestSession);

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) {
    return '';
  }

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  const cookiePrefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(cookiePrefix));

  if (!cookie) {
    return '';
  }

  return decodeURIComponent(cookie.slice(cookiePrefix.length));
}

module.exports = {
  createGetRequestSession,
  createRequireAuth,
  getCookieValue,
  getRequestSession,
  requireAuth,
};
