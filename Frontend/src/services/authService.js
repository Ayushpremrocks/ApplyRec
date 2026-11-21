import { apiRequest, setAuthToken, removeAuthToken } from './api';

async function signup(email, password) {
  const response = await apiRequest('/auth/signup', { method: 'POST', body: { email, password } });
  setAuthToken(response.token);
  return response;
}

async function login(email, password) {
  const response = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  setAuthToken(response.token);
  return response;
}

async function requestPasswordReset(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });
}

async function resetPassword(token, password) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
}

function logout() {
  removeAuthToken();
}

export { signup, login, logout, requestPasswordReset, resetPassword };
