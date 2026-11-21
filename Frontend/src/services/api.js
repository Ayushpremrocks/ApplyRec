const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
const TOKEN_KEY = 'token';

/** A request slower than this is probably hitting a sleeping (free-tier) server. */
const SLOW_REQUEST_MS = 3000;

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

// ---------------------------------------------------------------- waking-server signal

let slowRequests = 0;
const wakeListeners = new Set();

function notifyWake() {
  const waking = slowRequests > 0;
  wakeListeners.forEach((listener) => listener(waking));
}

/** Subscribes to "a request is taking unusually long" (server cold start). Returns unsubscribe. */
function subscribeServerWaking(listener) {
  wakeListeners.add(listener);
  return () => wakeListeners.delete(listener);
}

function isServerWaking() {
  return slowRequests > 0;
}

/** Fire-and-forget request that starts waking the backend while the user reads the page. */
function warmUpServer() {
  try {
    fetch(`${API_BASE_URL}/health`, { method: 'GET', cache: 'no-store' }).catch(() => {});
  } catch {
    // ignore
  }
}

// ----------------------------------------------------------------------------- requests

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Delays between retries of idempotent requests while the server is starting up. */
let retryDelaysMs = [2000, 4000, 8000];

function setRetryDelays(delays) {
  retryDelaysMs = delays;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

async function fetchOnce(url, init) {
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    slowRequests += 1;
    notifyWake();
  }, SLOW_REQUEST_MS);
  try {
    return await fetch(url, init);
  } finally {
    clearTimeout(timer);
    if (slow) {
      slowRequests -= 1;
      notifyWake();
    }
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const { body, headers, retry, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();
  const canRetry = retry ?? method === 'GET';
  const init = {
    ...rest,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  };

  let response;
  for (let attempt = 0; ; attempt += 1) {
    const lastAttempt = !canRetry || attempt >= retryDelaysMs.length;
    try {
      response = await fetchOnce(`${API_BASE_URL}${endpoint}`, init);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (!lastAttempt) {
        await sleep(retryDelaysMs[attempt], rest.signal);
        continue;
      }
      throw new ApiError('Cannot reach the server. It may be waking up — please try again in a moment.', 0);
    }
    if (RETRYABLE_STATUS.has(response.status) && !lastAttempt) {
      await sleep(retryDelaysMs[attempt], rest.signal);
      continue;
    }
    break;
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
    if (response.status === 429) throw new ApiError('Too many attempts. Please wait a moment and try again.', 429);
    if (RETRYABLE_STATUS.has(response.status)) {
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
  setRetryDelays,
  subscribeServerWaking,
  isServerWaking,
  warmUpServer,
  apiRequest,
};
