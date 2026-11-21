import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apiRequest,
  isAuthenticated,
  isTokenExpired,
  setAuthToken,
  getAuthToken,
  setUnauthorizedHandler,
} from './api';

const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (exp) => `${b64url({ alg: 'HS256' })}.${b64url({ userId: 1, exp })}.sig`;
const nowSec = () => Math.floor(Date.now() / 1000);

function mockFetch(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: body === undefined ? () => Promise.reject(new Error('no body')) : () => Promise.resolve(body),
  });
}

describe('api', () => {
  let onUnauthorized;

  beforeEach(() => {
    localStorage.clear();
    onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects expired and malformed tokens', () => {
    expect(isTokenExpired(makeToken(nowSec() + 3600))).toBe(false);
    expect(isTokenExpired(makeToken(nowSec() - 10))).toBe(true);
    expect(isTokenExpired('not.a.token')).toBe(true);
  });

  it('isAuthenticated clears an expired token', () => {
    setAuthToken(makeToken(nowSec() - 10));
    expect(isAuthenticated()).toBe(false);
    expect(getAuthToken()).toBeNull();

    setAuthToken(makeToken(nowSec() + 3600));
    expect(isAuthenticated()).toBe(true);
  });

  it('logs out and redirects on 401 from a protected endpoint', async () => {
    setAuthToken(makeToken(nowSec() + 3600));
    mockFetch(401, { error: 'Authentication required' });

    await expect(apiRequest('/applications')).rejects.toMatchObject({ status: 401 });
    expect(getAuthToken()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not redirect on 401 from login (wrong password)', async () => {
    mockFetch(401, { error: 'Invalid email or password' });
    await expect(apiRequest('/auth/login', { method: 'POST', body: {} })).rejects.toThrow(
      'Invalid email or password'
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('surfaces the server error message', async () => {
    mockFetch(400, { error: 'salary: must be at most 9999.99 LPA' });
    await expect(apiRequest('/applications')).rejects.toThrow('salary: must be at most 9999.99 LPA');
  });

  it('explains non-JSON 503s (cold start)', async () => {
    mockFetch(503);
    await expect(apiRequest('/applications')).rejects.toThrow(/starting up/);
  });

  it('explains network failures', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(apiRequest('/applications')).rejects.toThrow(/Cannot reach the server/);
  });

  it('sends the bearer token and JSON body', async () => {
    setAuthToken('abc');
    mockFetch(200, { ok: true });
    await apiRequest('/applications', { method: 'POST', body: { a: 1 } });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(init.body).toBe('{"a":1}');
  });
});
