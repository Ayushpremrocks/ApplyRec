const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
const TOKEN_KEY = 'token';

function safeStorage(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function getAuthToken() {
  return safeStorage(() => localStorage.getItem(TOKEN_KEY));
}

function setAuthToken(token) {
  safeStorage(() => localStorage.setItem(TOKEN_KEY, token));
}

function removeAuthToken() {
  safeStorage(() => localStorage.removeItem(TOKEN_KEY));
}

/** Reads the `exp` claim without verifying the signature (the server does that). */
function isTokenExpired(token, nowMs = Date.now()) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 <= nowMs;
  } catch {
    return true;
  }
}

/** True when a token exists and has not expired; clears stale tokens as a side effect. */
function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;
  if (isTokenExpired(token)) {
    removeAuthToken();
    return false;
  }
  return true;
}

/** Called when the server rejects our token. Overridable for tests. */
let onUnauthorized = () => {
  window.location.replace('/login?expired=1');
};

function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const { body, headers, ...rest } = options;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the server. It may be waking up — please try again in a moment.', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body (e.g. proxy error page); handled below.
  }

  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    removeAuthToken();
    onUnauthorized();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    if (data?.error) throw new ApiError(data.error, response.status);
    if (response.status === 502 || response.status === 503) {
      throw new ApiError('Server is starting up. Please try again in a moment.', response.status);
    }
    throw new ApiError(`Request failed (${response.status})`, response.status);
  }

  if (data === null) {
    throw new ApiError('Invalid response from server', response.status);
  }
  return data;
}

export {
  API_BASE_URL,
  ApiError,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  isTokenExpired,
  isAuthenticated,
  setUnauthorizedHandler,
  apiRequest,
};
