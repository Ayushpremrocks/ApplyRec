import { apiRequest } from './api';
import { hasValue } from '../utils/applications';

/**
 * Converts form state into the API's request shape.
 * Empty strings become null; salary 0 is kept.
 */
export function toApplicationPayload(form) {
  return {
    company: form.company.trim(),
    role: form.role.trim(),
    status: form.status,
    appliedDate: form.appliedDate,
    notes: form.notes?.trim() ? form.notes : null,
    followUp: Boolean(form.followUp),
    jobId: form.jobId?.trim() ? form.jobId.trim() : null,
    salary: hasValue(form.salary) ? Number(form.salary) : null,
  };
}

export async function createApplication(payload) {
  const response = await apiRequest('/applications', { method: 'POST', body: payload });
  return response.application;
}

export async function getApplications(filters = {}, { signal } = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (hasValue(value)) params.append(key, value);
  });
  const query = params.toString();
  const response = await apiRequest(query ? `/applications?${query}` : '/applications', {
    method: 'GET',
    signal,
  });
  return response.applications;
}

export async function getApplication(id) {
  const response = await apiRequest(`/applications/${id}`, { method: 'GET' });
  return response.application;
}

export async function updateApplication(id, payload) {
  const response = await apiRequest(`/applications/${id}`, { method: 'PUT', body: payload });
  return response.application;
}

export async function updateApplicationStatus(id, status) {
  const response = await apiRequest(`/applications/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
  return response.application;
}

export async function deleteApplication(id) {
  return apiRequest(`/applications/${id}`, { method: 'DELETE' });
}

export async function getRoles() {
  const response = await apiRequest('/applications/roles', { method: 'GET' });
  return response.roles;
}
